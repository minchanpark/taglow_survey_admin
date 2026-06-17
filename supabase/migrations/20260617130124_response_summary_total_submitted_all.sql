create or replace function public.get_response_summary(p_survey_id uuid, p_filters jsonb default '{}'::jsonb)
returns table (
  total_responses bigint,
  submitted_responses bigint,
  filtered_responses bigint,
  low_sample_threshold integer,
  is_low_sample boolean,
  profile_distribution jsonb,
  low_sample_groups jsonb
)
language sql
stable
set search_path to 'private', 'public'
as $$
  with threshold as (select 10::integer as value),
  dimensions(payload_key, output_key, order_index) as (
    values
      ('gender', 'gender', 1),
      ('semester_group', 'semesterGroup', 2),
      ('department', 'department', 3),
      ('rc', 'rc', 4),
      ('dormitory', 'dormitory', 5),
      ('room_type', 'roomType', 6),
      ('dorm_experience', 'dormExperience', 7)
  ),
  submitted_responses as (
    select *
    from public.analysis_response_facts f
    where f.survey_id = p_survey_id
      and f.status = 'submitted'
  ),
  valid_responses as (
    select *
    from submitted_responses f
    where f.passed_attention_check = true
  ),
  filtered_responses as (
    select *
    from valid_responses f
    where private.analysis_fact_matches_filters(
      f.gender,
      f.semester_group,
      f.department,
      f.rc,
      f.dormitory,
      f.room_type,
      f.dorm_experience,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      p_filters
    )
  ),
  counts as (
    select
      (select count(*) from submitted_responses)::bigint as total_responses,
      (select count(*) from valid_responses)::bigint as submitted_responses,
      (select count(*) from filtered_responses)::bigint as filtered_responses
  ),
  raw_profile_values as (
    select value_rows.dimension, nullif(value_rows.raw_label, '') as raw_label
    from filtered_responses f
    cross join lateral (
      values
        ('gender', f.gender),
        ('semester_group', f.semester_group),
        ('department', f.department),
        ('rc', f.rc),
        ('dormitory', f.dormitory),
        ('room_type', f.room_type),
        ('dorm_experience', f.dorm_experience)
    ) as value_rows(dimension, raw_label)
  ),
  profile_options as (
    select d.payload_key, o.option_value, o.option_label, o.order_index
    from dimensions d
    left join lateral private.analysis_profile_options(p_survey_id, d.payload_key) o on true
  ),
  option_presence as (
    select payload_key, count(option_value) > 0 as has_options
    from profile_options
    group by payload_key
  ),
  normalized_profile_values as (
    select
      rv.dimension,
      case
        when rv.raw_label is null then '기타/미분류'
        when op.has_options and exists (
          select 1
          from profile_options po
          where po.payload_key = rv.dimension
            and po.option_value = rv.raw_label
        ) then rv.raw_label
        when op.has_options then '기타/미분류'
        else rv.raw_label
      end as option_value
    from raw_profile_values rv
    join option_presence op on op.payload_key = rv.dimension
  ),
  profile_counts as (
    select dimension, option_value, count(*)::integer as n
    from normalized_profile_values
    group by dimension, option_value
  ),
  profile_totals as (
    select d.payload_key, count(n.option_value)::numeric as n
    from dimensions d
    left join normalized_profile_values n on n.dimension = d.payload_key
    group by d.payload_key
  ),
  profile_labels as (
    select po.payload_key, po.option_value, po.option_label, po.order_index, false as is_unclassified
    from profile_options po
    where po.option_value is not null
    union all
    select pc.dimension, '기타/미분류', '기타/미분류', 999999, true
    from profile_counts pc
    where pc.option_value = '기타/미분류'
    group by pc.dimension
    union all
    select
      pc.dimension,
      pc.option_value,
      pc.option_value,
      1000000 + row_number() over (partition by pc.dimension order by pc.option_value)::integer,
      false
    from profile_counts pc
    join option_presence op on op.payload_key = pc.dimension
    where not op.has_options
      and pc.option_value <> '기타/미분류'
  ),
  distribution_rows as (
    select
      pl.payload_key,
      jsonb_agg(
        jsonb_build_object(
          'key', pl.option_value,
          'label', pl.option_label,
          'n', coalesce(pc.n, 0),
          'percentage', case when pt.n > 0 then round((coalesce(pc.n, 0)::numeric / pt.n) * 100, 1) else 0 end,
          'isUnclassified', pl.is_unclassified
        )
        order by pl.order_index
      ) as distribution
    from profile_labels pl
    left join profile_counts pc on pc.dimension = pl.payload_key and pc.option_value = pl.option_value
    join profile_totals pt on pt.payload_key = pl.payload_key
    group by pl.payload_key
  ),
  low_sample_rows as (
    select d.output_key as dimension, pl.option_label as label, coalesce(pc.n, 0) as n, d.order_index
    from dimensions d
    join profile_labels pl on pl.payload_key = d.payload_key
    left join profile_counts pc on pc.dimension = pl.payload_key and pc.option_value = pl.option_value
    cross join threshold
    where coalesce(pc.n, 0) > 0
      and coalesce(pc.n, 0) < threshold.value
  )
  select
    counts.total_responses,
    counts.submitted_responses,
    counts.filtered_responses,
    threshold.value as low_sample_threshold,
    counts.filtered_responses > 0 and counts.filtered_responses < threshold.value as is_low_sample,
    jsonb_build_object(
      'gender', coalesce((select distribution from distribution_rows where payload_key = 'gender'), '[]'::jsonb),
      'semesterGroups', coalesce((select distribution from distribution_rows where payload_key = 'semester_group'), '[]'::jsonb),
      'department', coalesce((select distribution from distribution_rows where payload_key = 'department'), '[]'::jsonb),
      'rc', coalesce((select distribution from distribution_rows where payload_key = 'rc'), '[]'::jsonb),
      'dormitory', coalesce((select distribution from distribution_rows where payload_key = 'dormitory'), '[]'::jsonb),
      'roomType', coalesce((select distribution from distribution_rows where payload_key = 'room_type'), '[]'::jsonb),
      'dormExperience', coalesce((select distribution from distribution_rows where payload_key = 'dorm_experience'), '[]'::jsonb)
    ) as profile_distribution,
    (
      select coalesce(
        jsonb_agg(jsonb_build_object('dimension', dimension, 'label', label, 'n', n) order by order_index, n asc, label),
        '[]'::jsonb
      )
      from low_sample_rows
    ) as low_sample_groups
  from counts
  cross join threshold;
$$;

grant execute on function public.get_response_summary(uuid, jsonb) to authenticated;

notify pgrst, 'reload schema';
