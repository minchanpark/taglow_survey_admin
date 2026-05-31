create schema if not exists private;

create or replace function private.analysis_profile_field_key(p_value text)
returns text
language sql
stable
set search_path to 'private', 'public'
as $$
  select case nullif(p_value, '')
    when 'gender' then 'gender'
    when 'semester' then 'semester_group'
    when 'semester_group' then 'semester_group'
    when 'semesterGroup' then 'semester_group'
    when 'department' then 'department'
    when 'rc' then 'rc'
    when 'dormitory' then 'dormitory'
    when 'room_type' then 'room_type'
    when 'roomType' then 'room_type'
    when 'dorm_experience' then 'dorm_experience'
    when 'dormExperience' then 'dorm_experience'
    else null
  end;
$$;

create or replace function private.analysis_profile_options(p_survey_id uuid, p_dimension text)
returns table(option_value text, option_label text, order_index integer)
language sql
stable
set search_path to 'private', 'public'
as $$
  with target as (
    select private.analysis_profile_field_key(p_dimension) as profile_field
  ),
  raw_options as (
    select
      nullif(option_item.option->>'value', '') as option_value,
      coalesce(
        nullif(option_item.option->>'labelKo', ''),
        nullif(option_item.option->>'label', ''),
        nullif(option_item.option->>'labelEn', ''),
        nullif(option_item.option->>'value', '')
      ) as option_label,
      (q.order_index * 1000 + option_item.ordinality)::integer as order_index
    from public.questions q
    cross join target
    cross join lateral jsonb_array_elements(
      case
        when jsonb_typeof(q.config->'options') = 'array' then q.config->'options'
        else '[]'::jsonb
      end
    ) with ordinality as option_item(option, ordinality)
    where q.survey_id = p_survey_id
      and private.analysis_profile_field_key(
        coalesce(nullif(q.config->>'profileField', ''), nullif(q.config->>'profile_field', ''))
      ) = target.profile_field
  )
  select distinct on (raw_options.option_value)
    raw_options.option_value,
    coalesce(raw_options.option_label, raw_options.option_value) as option_label,
    raw_options.order_index
  from raw_options
  where raw_options.option_value is not null
  order by raw_options.option_value, raw_options.order_index;
$$;

create or replace function private.analysis_profile_answer_value(
  p_response_id uuid,
  p_survey_id uuid,
  p_dimension text
)
returns text
language sql
stable
set search_path to 'private', 'public'
as $$
  with target as (
    select private.analysis_profile_field_key(p_dimension) as profile_field
  )
  select coalesce(
    nullif(a.choice_value, ''),
    nullif(a.value_json->>'choiceValue', ''),
    nullif(a.value_json->>'choice_value', ''),
    nullif(a.value_json->>'selectedValue', ''),
    nullif(a.value_json->>'selected_value', ''),
    nullif(a.value_json->>'value', ''),
    nullif(a.text_value, ''),
    nullif(a.value_json->>'labelKo', ''),
    nullif(a.value_json->>'label', ''),
    nullif(a.value_json->>'labelEn', '')
  )
  from public.answers a
  join public.questions q on q.id = a.question_id and q.survey_id = a.survey_id
  cross join target
  where a.response_id = p_response_id
    and a.survey_id = p_survey_id
    and (a.answer_type = 'profile' or q.question_type = 'profile')
    and private.analysis_profile_field_key(
      coalesce(nullif(q.config->>'profileField', ''), nullif(q.config->>'profile_field', ''))
    ) = target.profile_field
  order by q.order_index, a.created_at
  limit 1;
$$;

create or replace function private.analysis_filter_value(p_response public.responses, p_dimension text)
returns text
language sql
stable
set search_path to 'private', 'public'
as $$
  select case p_dimension
    when 'gender' then coalesce(
      nullif(p_response.gender, ''),
      nullif(p_response.profile_json->>'gender', ''),
      nullif(p_response.profile_json #>> '{profile,gender}', ''),
      nullif(p_response.raw_payload->>'gender', ''),
      nullif(p_response.raw_payload #>> '{profile,gender}', ''),
      private.analysis_profile_answer_value(p_response.id, p_response.survey_id, 'gender')
    )
    when 'semester_group' then coalesce(
      nullif(p_response.semester_group, ''),
      nullif(p_response.profile_json->>'semester_group', ''),
      nullif(p_response.profile_json->>'semesterGroup', ''),
      nullif(p_response.profile_json #>> '{profile,semester_group}', ''),
      nullif(p_response.profile_json #>> '{profile,semesterGroup}', ''),
      nullif(p_response.raw_payload->>'semester_group', ''),
      nullif(p_response.raw_payload->>'semesterGroup', ''),
      nullif(p_response.raw_payload #>> '{profile,semester_group}', ''),
      nullif(p_response.raw_payload #>> '{profile,semesterGroup}', ''),
      private.analysis_profile_answer_value(p_response.id, p_response.survey_id, 'semester_group')
    )
    when 'department' then coalesce(
      nullif(p_response.department, ''),
      nullif(p_response.profile_json->>'department', ''),
      nullif(p_response.profile_json #>> '{profile,department}', ''),
      nullif(p_response.raw_payload->>'department', ''),
      nullif(p_response.raw_payload #>> '{profile,department}', ''),
      private.analysis_profile_answer_value(p_response.id, p_response.survey_id, 'department')
    )
    when 'rc' then coalesce(
      nullif(p_response.rc, ''),
      nullif(p_response.profile_json->>'rc', ''),
      nullif(p_response.profile_json #>> '{profile,rc}', ''),
      nullif(p_response.raw_payload->>'rc', ''),
      nullif(p_response.raw_payload #>> '{profile,rc}', ''),
      private.analysis_profile_answer_value(p_response.id, p_response.survey_id, 'rc')
    )
    when 'dormitory' then coalesce(
      nullif(p_response.dormitory, ''),
      nullif(p_response.profile_json->>'dormitory', ''),
      nullif(p_response.profile_json #>> '{profile,dormitory}', ''),
      nullif(p_response.raw_payload->>'dormitory', ''),
      nullif(p_response.raw_payload #>> '{profile,dormitory}', ''),
      private.analysis_profile_answer_value(p_response.id, p_response.survey_id, 'dormitory')
    )
    when 'room_type' then coalesce(
      nullif(p_response.room_type, ''),
      nullif(p_response.profile_json->>'room_type', ''),
      nullif(p_response.profile_json->>'roomType', ''),
      nullif(p_response.profile_json #>> '{profile,room_type}', ''),
      nullif(p_response.profile_json #>> '{profile,roomType}', ''),
      nullif(p_response.raw_payload->>'room_type', ''),
      nullif(p_response.raw_payload->>'roomType', ''),
      nullif(p_response.raw_payload #>> '{profile,room_type}', ''),
      nullif(p_response.raw_payload #>> '{profile,roomType}', ''),
      private.analysis_profile_answer_value(p_response.id, p_response.survey_id, 'room_type')
    )
    when 'dorm_experience' then coalesce(
      nullif(p_response.dorm_experience, ''),
      nullif(p_response.profile_json->>'dorm_experience', ''),
      nullif(p_response.profile_json->>'dormExperience', ''),
      nullif(p_response.profile_json #>> '{profile,dorm_experience}', ''),
      nullif(p_response.profile_json #>> '{profile,dormExperience}', ''),
      nullif(p_response.raw_payload->>'dorm_experience', ''),
      nullif(p_response.raw_payload->>'dormExperience', ''),
      nullif(p_response.raw_payload #>> '{profile,dorm_experience}', ''),
      nullif(p_response.raw_payload #>> '{profile,dormExperience}', ''),
      private.analysis_profile_answer_value(p_response.id, p_response.survey_id, 'dorm_experience')
    )
    else null
  end;
$$;

create index if not exists idx_analysis_answers_profile_response
on public.answers (survey_id, response_id, question_id, created_at)
where answer_type = 'profile';

create or replace function private.matches_analysis_profile_filters(p_response public.responses, p_filters jsonb default '{}'::jsonb)
returns boolean
language sql
stable
set search_path to 'private', 'public'
as $$
  select
    (nullif(p_filters->>'gender', '') is null or private.analysis_filter_value(p_response, 'gender') = p_filters->>'gender')
    and (nullif(p_filters->>'semester_group', '') is null or private.analysis_filter_value(p_response, 'semester_group') = p_filters->>'semester_group')
    and (nullif(p_filters->>'department', '') is null or private.analysis_filter_value(p_response, 'department') = p_filters->>'department')
    and (nullif(p_filters->>'rc', '') is null or private.analysis_filter_value(p_response, 'rc') = p_filters->>'rc')
    and (nullif(p_filters->>'dormitory', '') is null or private.analysis_filter_value(p_response, 'dormitory') = p_filters->>'dormitory')
    and (nullif(p_filters->>'room_type', '') is null or private.analysis_filter_value(p_response, 'room_type') = p_filters->>'room_type')
    and (nullif(p_filters->>'dorm_experience', '') is null or private.analysis_filter_value(p_response, 'dorm_experience') = p_filters->>'dorm_experience');
$$;

create or replace function private.matches_analysis_answer_filters(p_answer public.answers, p_filters jsonb default '{}'::jsonb)
returns boolean
language sql
stable
set search_path to 'private', 'public'
as $$
  select
    (nullif(p_filters->>'section_id', '') is null or p_answer.section_id::text = p_filters->>'section_id')
    and (nullif(p_filters->>'topic_key', '') is null or p_answer.topic_key = p_filters->>'topic_key')
    and (nullif(p_filters->>'space_key', '') is null or p_answer.space_key = p_filters->>'space_key')
    and (nullif(p_filters->>'asset_id', '') is null or p_answer.asset_id::text = p_filters->>'asset_id')
    and (nullif(p_filters->>'tag_type', '') is null or p_answer.tag_type = p_filters->>'tag_type');
$$;

create or replace function private.analysis_profile_distribution(
  p_survey_id uuid,
  p_filters jsonb,
  p_dimension text
)
returns jsonb
language sql
stable
set search_path to 'private', 'public'
as $$
  with filtered_responses as (
    select nullif(private.analysis_filter_value(r, p_dimension), '') as raw_label
    from public.responses r
    where r.survey_id = p_survey_id
      and r.status = 'submitted'
      and private.matches_analysis_profile_filters(r, p_filters)
  ),
  profile_options as (
    select option_value, option_label, order_index
    from private.analysis_profile_options(p_survey_id, p_dimension)
  ),
  normalized as (
    select
      case
        when raw_label is null then '기타/미분류'
        when exists (select 1 from profile_options o where o.option_value = raw_label) then raw_label
        when exists (select 1 from profile_options) then '기타/미분류'
        else raw_label
      end as option_value
    from filtered_responses
  ),
  counts as (
    select option_value, count(*)::integer as n
    from normalized
    group by option_value
  ),
  total as (
    select greatest(coalesce(sum(n), 0), 0)::numeric as n
    from counts
  ),
  ordered_labels as (
    select o.option_value, o.option_label, o.order_index, false as is_unclassified
    from profile_options o
    union all
    select '기타/미분류', '기타/미분류', 999999, true
    where exists (select 1 from counts where option_value = '기타/미분류')
    union all
    select counts.option_value, counts.option_value, 1000000 + row_number() over (order by counts.option_value)::integer, false
    from counts
    where not exists (select 1 from profile_options)
      and counts.option_value <> '기타/미분류'
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'key', ordered_labels.option_value,
        'label', ordered_labels.option_label,
        'n', coalesce(counts.n, 0),
        'percentage', case when total.n > 0 then round((coalesce(counts.n, 0)::numeric / total.n) * 100, 1) else 0 end,
        'isUnclassified', ordered_labels.is_unclassified
      )
      order by ordered_labels.order_index
    ),
    '[]'::jsonb
  )
  from ordered_labels
  left join counts on counts.option_value = ordered_labels.option_value
  cross join total;
$$;

create or replace function private.analysis_low_sample_groups(
  p_survey_id uuid,
  p_filters jsonb,
  p_threshold integer default 10
)
returns jsonb
language sql
stable
set search_path to 'private', 'public'
as $$
  with dimensions(dimension, payload_key, order_index) as (
    values
      ('gender', 'gender', 1),
      ('semesterGroup', 'semester_group', 2),
      ('department', 'department', 3),
      ('rc', 'rc', 4),
      ('dormitory', 'dormitory', 5),
      ('roomType', 'room_type', 6),
      ('dormExperience', 'dorm_experience', 7)
  ),
  rows as (
    select d.dimension, d.order_index, item.label, item.n
    from dimensions d
    cross join lateral jsonb_to_recordset(private.analysis_profile_distribution(p_survey_id, p_filters, d.payload_key))
      as item(label text, n integer)
    where item.n > 0 and item.n < p_threshold
  )
  select coalesce(
    jsonb_agg(jsonb_build_object('dimension', dimension, 'label', label, 'n', n) order by order_index, n asc, label),
    '[]'::jsonb
  )
  from rows;
$$;

drop function if exists public.get_survey_filter_options(uuid);

create or replace function public.get_survey_filter_options(p_survey_id uuid)
returns table(
  genders text[],
  semester_groups text[],
  departments text[],
  rcs text[],
  dormitories text[],
  room_types text[],
  dorm_experiences text[]
)
language sql
stable
set search_path to 'private', 'public'
as $$
  select
    array(select option_value from private.analysis_profile_options(p_survey_id, 'gender') order by order_index) as genders,
    array(select option_value from private.analysis_profile_options(p_survey_id, 'semester_group') order by order_index) as semester_groups,
    array(select option_value from private.analysis_profile_options(p_survey_id, 'department') order by order_index) as departments,
    array(select option_value from private.analysis_profile_options(p_survey_id, 'rc') order by order_index) as rcs,
    array(select option_value from private.analysis_profile_options(p_survey_id, 'dormitory') order by order_index) as dormitories,
    array(select option_value from private.analysis_profile_options(p_survey_id, 'room_type') order by order_index) as room_types,
    array(select option_value from private.analysis_profile_options(p_survey_id, 'dorm_experience') order by order_index) as dorm_experiences;
$$;

create or replace function public.get_response_summary(p_survey_id uuid, p_filters jsonb default '{}'::jsonb)
returns table(
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
  with counts as (
    select
      count(*)::bigint as total_responses,
      count(*) filter (where r.status = 'submitted')::bigint as submitted_responses,
      count(*) filter (where r.status = 'submitted' and private.matches_analysis_profile_filters(r, p_filters))::bigint as filtered_responses
    from public.responses r
    where r.survey_id = p_survey_id
  ),
  threshold as (
    select 10::integer as value
  )
  select
    counts.total_responses,
    counts.submitted_responses,
    counts.filtered_responses,
    threshold.value as low_sample_threshold,
    counts.filtered_responses > 0 and counts.filtered_responses < threshold.value as is_low_sample,
    jsonb_build_object(
      'gender', private.analysis_profile_distribution(p_survey_id, p_filters, 'gender'),
      'semesterGroups', private.analysis_profile_distribution(p_survey_id, p_filters, 'semester_group'),
      'department', private.analysis_profile_distribution(p_survey_id, p_filters, 'department'),
      'rc', private.analysis_profile_distribution(p_survey_id, p_filters, 'rc'),
      'dormitory', private.analysis_profile_distribution(p_survey_id, p_filters, 'dormitory'),
      'roomType', private.analysis_profile_distribution(p_survey_id, p_filters, 'room_type'),
      'dormExperience', private.analysis_profile_distribution(p_survey_id, p_filters, 'dorm_experience')
    ) as profile_distribution,
    private.analysis_low_sample_groups(p_survey_id, p_filters, threshold.value) as low_sample_groups
  from counts
  cross join threshold;
$$;

create or replace function public.get_group_compare_summary(p_survey_id uuid, p_filters jsonb default '{}'::jsonb)
returns table(
  group_key text,
  group_label text,
  avg_score numeric,
  n bigint,
  is_highest boolean,
  is_lowest boolean,
  is_low_sample boolean
)
language sql
stable
set search_path to 'private', 'public'
as $$
  with params as (
    select coalesce(nullif(p_filters->>'group_by', ''), 'dormitory') as group_by
  ),
  profile_options as (
    select option_value, option_label, order_index
    from params, private.analysis_profile_options(p_survey_id, params.group_by)
  ),
  raw_scores as (
    select
      case
        when private.analysis_filter_value(r, params.group_by) is null then '기타/미분류'
        when exists (select 1 from profile_options o where o.option_value = private.analysis_filter_value(r, params.group_by))
          then private.analysis_filter_value(r, params.group_by)
        when exists (select 1 from profile_options) then '기타/미분류'
        else private.analysis_filter_value(r, params.group_by)
      end as group_value,
      a.score_value
    from params
    join public.answers a on a.survey_id = p_survey_id
    join public.responses r on r.id = a.response_id and r.survey_id = a.survey_id
    where r.status = 'submitted'
      and a.answer_type = 'scale'
      and a.metric_type = coalesce(nullif(p_filters->>'metric_type', ''), 'satisfaction')
      and a.score_value is not null
      and private.matches_analysis_profile_filters(r, p_filters)
      and private.matches_analysis_answer_filters(a, p_filters)
      and (
        nullif(p_filters->>'target_id', '') is null
        or (p_filters->>'target_kind' = 'section' and a.section_id::text = p_filters->>'target_id')
        or (p_filters->>'target_kind' = 'question' and a.question_id::text = p_filters->>'target_id')
        or (p_filters->>'target_kind' = 'topic' and a.topic_key = p_filters->>'target_id')
      )
  ),
  grouped as (
    select group_value, round(avg(score_value)::numeric, 2) as avg_score, count(*)::bigint as n
    from raw_scores
    group by group_value
  ),
  labels as (
    select o.option_value as group_value, o.option_label as group_label, o.order_index
    from profile_options o
    union all
    select '기타/미분류', '기타/미분류', 999999
    where exists (select 1 from grouped where group_value = '기타/미분류')
    union all
    select g.group_value, g.group_value, 1000000 + row_number() over (order by g.group_value)::integer
    from grouped g
    where not exists (select 1 from profile_options) and g.group_value <> '기타/미분류'
  ),
  final_rows as (
    select labels.group_value, labels.group_label, labels.order_index, grouped.avg_score, coalesce(grouped.n, 0)::bigint as n
    from labels
    left join grouped on grouped.group_value = labels.group_value
  ),
  extrema as (
    select max(avg_score) as max_score, min(avg_score) as min_score
    from final_rows
    where n > 0
  )
  select
    final_rows.group_value as group_key,
    final_rows.group_label,
    final_rows.avg_score,
    final_rows.n,
    final_rows.n > 0 and final_rows.avg_score = extrema.max_score as is_highest,
    final_rows.n > 0 and final_rows.avg_score = extrema.min_score as is_lowest,
    final_rows.n > 0 and final_rows.n < 10 as is_low_sample
  from final_rows
  cross join extrema
  order by final_rows.order_index, final_rows.group_label;
$$;
