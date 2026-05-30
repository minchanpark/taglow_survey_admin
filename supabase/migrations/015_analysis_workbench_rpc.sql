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
      and q.question_type = 'profile'
      and private.analysis_profile_field_key(q.config->>'profileField') = target.profile_field
  )
  select distinct on (raw_options.option_value)
    raw_options.option_value,
    coalesce(raw_options.option_label, raw_options.option_value) as option_label,
    raw_options.order_index
  from raw_options
  where raw_options.option_value is not null
  order by raw_options.option_value, raw_options.order_index;
$$;

create or replace function private.analysis_filter_value(p_response public.responses, p_dimension text)
returns text
language sql
stable
set search_path to 'private', 'public'
as $$
  select case p_dimension
    when 'gender' then p_response.gender
    when 'semester_group' then p_response.semester_group
    when 'department' then p_response.department
    when 'rc' then p_response.rc
    when 'dormitory' then p_response.dormitory
    when 'room_type' then p_response.room_type
    when 'dorm_experience' then p_response.dorm_experience
    else null
  end;
$$;

create or replace function private.matches_analysis_profile_filters(p_response public.responses, p_filters jsonb default '{}'::jsonb)
returns boolean
language sql
stable
set search_path to 'private', 'public'
as $$
  select
    (nullif(p_filters->>'gender', '') is null or p_response.gender = p_filters->>'gender')
    and (nullif(p_filters->>'semester_group', '') is null or p_response.semester_group = p_filters->>'semester_group')
    and (nullif(p_filters->>'department', '') is null or p_response.department = p_filters->>'department')
    and (nullif(p_filters->>'rc', '') is null or p_response.rc = p_filters->>'rc')
    and (nullif(p_filters->>'dormitory', '') is null or p_response.dormitory = p_filters->>'dormitory')
    and (nullif(p_filters->>'room_type', '') is null or p_response.room_type = p_filters->>'room_type')
    and (nullif(p_filters->>'dorm_experience', '') is null or p_response.dorm_experience = p_filters->>'dorm_experience');
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
  with dimensions(dimension, payload_key) as (
    values
      ('semesterGroup', 'semester_group'),
      ('gender', 'gender'),
      ('department', 'department'),
      ('rc', 'rc'),
      ('dormitory', 'dormitory'),
      ('roomType', 'room_type')
  ),
  rows as (
    select d.dimension, item.label, item.n
    from dimensions d
    cross join lateral jsonb_to_recordset(private.analysis_profile_distribution(p_survey_id, p_filters, d.payload_key))
      as item(label text, n integer)
    where item.n > 0 and item.n < p_threshold
  )
  select coalesce(
    jsonb_agg(jsonb_build_object('dimension', dimension, 'label', label, 'n', n) order by dimension, n asc, label),
    '[]'::jsonb
  )
  from rows;
$$;

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
  )
  select
    counts.total_responses,
    counts.submitted_responses,
    counts.filtered_responses,
    10 as low_sample_threshold,
    counts.filtered_responses > 0 and counts.filtered_responses < 10 as is_low_sample,
    jsonb_build_object(
      'gender', private.analysis_profile_distribution(p_survey_id, p_filters, 'gender'),
      'semesterGroups', private.analysis_profile_distribution(p_survey_id, p_filters, 'semester_group'),
      'department', private.analysis_profile_distribution(p_survey_id, p_filters, 'department'),
      'rc', private.analysis_profile_distribution(p_survey_id, p_filters, 'rc'),
      'dormitory', private.analysis_profile_distribution(p_survey_id, p_filters, 'dormitory'),
      'roomType', private.analysis_profile_distribution(p_survey_id, p_filters, 'room_type'),
      'dormExperience', private.analysis_profile_distribution(p_survey_id, p_filters, 'dorm_experience')
    ) as profile_distribution,
    private.analysis_low_sample_groups(p_survey_id, p_filters, 10) as low_sample_groups
  from counts;
$$;

create or replace function public.get_section_satisfaction_summary(p_survey_id uuid, p_filters jsonb default '{}'::jsonb)
returns table(section_id uuid, section_title text, avg_score numeric, n bigint)
language sql
stable
set search_path to 'private', 'public'
as $$
  select
    a.section_id,
    coalesce(s.title_ko, '섹션 미지정') as section_title,
    round(avg(a.score_value)::numeric, 2) as avg_score,
    count(*)::bigint as n
  from public.answers a
  join public.responses r on r.id = a.response_id and r.survey_id = a.survey_id
  left join public.survey_sections s on s.id = a.section_id
  where a.survey_id = p_survey_id
    and r.status = 'submitted'
    and a.answer_type = 'scale'
    and a.metric_type = 'satisfaction'
    and a.score_value is not null
    and private.matches_analysis_profile_filters(r, p_filters)
    and private.matches_analysis_answer_filters(a, p_filters)
  group by a.section_id, s.title_ko
  order by avg_score asc nulls last, n desc;
$$;

create or replace function public.get_question_satisfaction_summary(p_survey_id uuid, p_filters jsonb default '{}'::jsonb)
returns table(
  question_id uuid,
  question_title text,
  section_id uuid,
  section_title text,
  topic_key text,
  metric_type text,
  avg_score numeric,
  stddev_score numeric,
  n bigint
)
language sql
stable
set search_path to 'private', 'public'
as $$
  select
    a.question_id,
    coalesce(q.title_ko, '제목 없는 질문') as question_title,
    a.section_id,
    coalesce(s.title_ko, '섹션 미지정') as section_title,
    a.topic_key,
    a.metric_type,
    round(avg(a.score_value)::numeric, 2) as avg_score,
    round(stddev_samp(a.score_value)::numeric, 2) as stddev_score,
    count(*)::bigint as n
  from public.answers a
  join public.responses r on r.id = a.response_id and r.survey_id = a.survey_id
  left join public.questions q on q.id = a.question_id
  left join public.survey_sections s on s.id = a.section_id
  where a.survey_id = p_survey_id
    and r.status = 'submitted'
    and a.answer_type = 'scale'
    and a.metric_type = 'satisfaction'
    and a.score_value is not null
    and private.matches_analysis_profile_filters(r, p_filters)
    and private.matches_analysis_answer_filters(a, p_filters)
  group by a.question_id, q.title_ko, a.section_id, s.title_ko, a.topic_key, a.metric_type
  order by avg_score asc nulls last, n desc, question_title;
$$;

create or replace function public.get_choice_distribution(p_survey_id uuid, p_filters jsonb default '{}'::jsonb)
returns table(
  question_id uuid,
  question_title text,
  section_id uuid,
  section_title text,
  option_value text,
  option_label text,
  count bigint,
  n bigint,
  percentage numeric
)
language sql
stable
set search_path to 'private', 'public'
as $$
  with base as (
    select
      a.question_id,
      coalesce(q.title_ko, '제목 없는 질문') as question_title,
      a.section_id,
      coalesce(s.title_ko, '섹션 미지정') as section_title,
      option_values.option_value
    from public.answers a
    join public.responses r on r.id = a.response_id and r.survey_id = a.survey_id
    left join public.questions q on q.id = a.question_id
    left join public.survey_sections s on s.id = a.section_id
    cross join lateral (
      select nullif(a.choice_value, '') as option_value
      where nullif(a.choice_value, '') is not null
      union all
      select nullif(a.value_json->>'choiceValue', '')
      where nullif(a.value_json->>'choiceValue', '') is not null
      union all
      select jsonb_array_elements_text(a.value_json->'values')
      where jsonb_typeof(a.value_json->'values') = 'array'
      union all
      select jsonb_array_elements_text(a.value_json->'choiceValues')
      where jsonb_typeof(a.value_json->'choiceValues') = 'array'
      union all
      select nullif(a.text_value, '')
      where a.answer_type = 'profile' and nullif(a.text_value, '') is not null
    ) as option_values
    where a.survey_id = p_survey_id
      and r.status = 'submitted'
      and a.answer_type in ('single_choice', 'multi_select', 'experience', 'profile')
      and private.matches_analysis_profile_filters(r, p_filters)
      and private.matches_analysis_answer_filters(a, p_filters)
  ),
  grouped as (
    select question_id, question_title, section_id, section_title, option_value, count(*)::bigint as count
    from base
    where option_value is not null
    group by question_id, question_title, section_id, section_title, option_value
  ),
  totals as (
    select question_id, sum(count)::bigint as n
    from grouped
    group by question_id
  )
  select
    grouped.question_id,
    grouped.question_title,
    grouped.section_id,
    grouped.section_title,
    grouped.option_value,
    grouped.option_value as option_label,
    grouped.count,
    totals.n,
    case when totals.n > 0 then round((grouped.count::numeric / totals.n::numeric) * 100, 1) else 0 end as percentage
  from grouped
  join totals on totals.question_id = grouped.question_id
  order by grouped.question_title, grouped.count desc, grouped.option_value;
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
  order by final_rows.order_index;
$$;

create or replace function public.get_borich_summary(p_survey_id uuid, p_filters jsonb default '{}'::jsonb)
returns table(
  topic_key text,
  avg_importance numeric,
  avg_satisfaction numeric,
  avg_gap numeric,
  borich_score numeric,
  n bigint
)
language sql
stable
set search_path to 'private', 'public'
as $$
  with pairs as (
    select
      a.response_id,
      a.topic_key,
      avg(a.score_value) filter (where a.metric_type = 'importance') as importance,
      avg(a.score_value) filter (where a.metric_type = 'satisfaction') as satisfaction
    from public.answers a
    join public.responses r on r.id = a.response_id and r.survey_id = a.survey_id
    where a.survey_id = p_survey_id
      and r.status = 'submitted'
      and a.answer_type = 'scale'
      and a.metric_type in ('importance', 'satisfaction')
      and a.topic_key is not null
      and a.score_value is not null
      and private.matches_analysis_profile_filters(r, p_filters)
      and private.matches_analysis_answer_filters(a, p_filters)
    group by a.response_id, a.topic_key
  ),
  complete_pairs as (
    select *
    from pairs
    where importance is not null and satisfaction is not null
  )
  select
    topic_key,
    round(avg(importance)::numeric, 2) as avg_importance,
    round(avg(satisfaction)::numeric, 2) as avg_satisfaction,
    round((avg(importance) - avg(satisfaction))::numeric, 2) as avg_gap,
    round((avg(importance) * (avg(importance) - avg(satisfaction)))::numeric, 2) as borich_score,
    count(*)::bigint as n
  from complete_pairs
  group by topic_key
  order by borich_score desc nulls last, n desc;
$$;

create or replace function public.get_locus_summary(p_survey_id uuid, p_filters jsonb default '{}'::jsonb)
returns table(
  topic_key text,
  label text,
  avg_importance numeric,
  avg_satisfaction numeric,
  avg_gap numeric,
  n bigint,
  quadrant text
)
language sql
stable
set search_path to 'private', 'public'
as $$
  with borich as (
    select *
    from public.get_borich_summary(p_survey_id, p_filters)
  ),
  center as (
    select avg(avg_importance) as importance_center, avg(avg_satisfaction) as satisfaction_center
    from borich
  )
  select
    borich.topic_key,
    borich.topic_key as label,
    borich.avg_importance,
    borich.avg_satisfaction,
    borich.avg_gap,
    borich.n,
    case
      when borich.avg_importance >= center.importance_center and borich.avg_satisfaction <= center.satisfaction_center then 'top_priority'
      when borich.avg_importance >= center.importance_center and borich.avg_satisfaction > center.satisfaction_center then 'maintain_strengthen'
      when borich.avg_importance < center.importance_center and borich.avg_satisfaction <= center.satisfaction_center then 'gradual_improvement'
      else 'maintain'
    end as quadrant
  from borich
  cross join center
  order by borich.avg_importance desc nulls last, borich.avg_satisfaction asc nulls last;
$$;

create or replace function public.get_priority_top5(p_survey_id uuid, p_filters jsonb default '{}'::jsonb)
returns table(
  id text,
  label text,
  source text,
  topic_key text,
  section_title text,
  avg_importance numeric,
  avg_satisfaction numeric,
  avg_gap numeric,
  borich_score numeric,
  text_count bigint,
  tag_count bigint,
  n bigint
)
language sql
stable
set search_path to 'private', 'public'
as $$
  with satisfaction as (
    select
      coalesce(a.topic_key, a.section_id::text, a.question_id::text) as key,
      max(s.title_ko) as section_title,
      avg(a.score_value) as avg_satisfaction,
      count(*)::bigint as n
    from public.answers a
    join public.responses r on r.id = a.response_id and r.survey_id = a.survey_id
    left join public.survey_sections s on s.id = a.section_id
    where a.survey_id = p_survey_id
      and r.status = 'submitted'
      and a.answer_type = 'scale'
      and a.metric_type = 'satisfaction'
      and a.score_value is not null
      and private.matches_analysis_profile_filters(r, p_filters)
      and private.matches_analysis_answer_filters(a, p_filters)
    group by coalesce(a.topic_key, a.section_id::text, a.question_id::text)
  ),
  borich as (
    select *
    from public.get_borich_summary(p_survey_id, p_filters)
  ),
  text_counts as (
    select coalesce(a.topic_key, a.section_id::text, a.question_id::text) as key, count(*)::bigint as text_count
    from public.answers a
    join public.responses r on r.id = a.response_id and r.survey_id = a.survey_id
    where a.survey_id = p_survey_id
      and r.status = 'submitted'
      and a.answer_type = 'text'
      and nullif(a.text_value, '') is not null
      and private.matches_analysis_profile_filters(r, p_filters)
      and private.matches_analysis_answer_filters(a, p_filters)
    group by coalesce(a.topic_key, a.section_id::text, a.question_id::text)
  ),
  tag_counts as (
    select coalesce(a.topic_key, a.asset_id::text, a.question_id::text) as key, count(*)::bigint as tag_count
    from public.answers a
    join public.responses r on r.id = a.response_id and r.survey_id = a.survey_id
    where a.survey_id = p_survey_id
      and r.status = 'submitted'
      and a.answer_type in ('image_tag', 'participant_image_tag')
      and private.matches_analysis_profile_filters(r, p_filters)
      and private.matches_analysis_answer_filters(a, p_filters)
    group by coalesce(a.topic_key, a.asset_id::text, a.question_id::text)
  ),
  merged as (
    select
      coalesce(b.topic_key, s.key, t.key, h.key) as key,
      s.section_title,
      b.avg_importance,
      coalesce(b.avg_satisfaction, round(s.avg_satisfaction::numeric, 2)) as avg_satisfaction,
      b.avg_gap,
      b.borich_score,
      coalesce(t.text_count, 0) as text_count,
      coalesce(h.tag_count, 0) as tag_count,
      coalesce(b.n, s.n, 0) as n,
      coalesce(b.borich_score, 0) + greatest(0, 5 - coalesce(b.avg_satisfaction, s.avg_satisfaction, 5)) + (coalesce(t.text_count, 0) * 0.08) + (coalesce(h.tag_count, 0) * 0.08) as priority_score
    from satisfaction s
    full join borich b on b.topic_key = s.key
    full join text_counts t on t.key = coalesce(b.topic_key, s.key)
    full join tag_counts h on h.key = coalesce(b.topic_key, s.key, t.key)
  )
  select
    key as id,
    key as label,
    case
      when borich_score is not null and (text_count > 0 or tag_count > 0) then 'mixed'
      when borich_score is not null then 'borich'
      when text_count > 0 then 'text'
      when tag_count > 0 then 'heatmap'
      else 'low_satisfaction'
    end as source,
    key as topic_key,
    section_title,
    avg_importance,
    avg_satisfaction,
    avg_gap,
    borich_score,
    text_count,
    tag_count,
    n
  from merged
  where key is not null
  order by priority_score desc nulls last, n desc
  limit 5;
$$;

create or replace function public.get_heatmap_points(p_survey_id uuid, p_filters jsonb default '{}'::jsonb)
returns table(
  answer_id uuid,
  asset_id uuid,
  x_ratio numeric,
  y_ratio numeric,
  tag_type text,
  severity integer,
  text_value text,
  dormitory text,
  room_type text,
  rc text,
  response_profile jsonb
)
language sql
stable
set search_path to 'private', 'public'
as $$
  select
    a.id as answer_id,
    a.asset_id,
    a.x_ratio,
    a.y_ratio,
    a.tag_type,
    a.severity,
    a.text_value,
    r.dormitory,
    r.room_type,
    r.rc,
    jsonb_strip_nulls(jsonb_build_object(
      'gender', r.gender,
      'semesterGroup', r.semester_group,
      'department', r.department,
      'rc', r.rc,
      'dormitory', r.dormitory,
      'roomType', r.room_type,
      'dormExperience', r.dorm_experience
    )) as response_profile
  from public.answers a
  join public.responses r on r.id = a.response_id and r.survey_id = a.survey_id
  where a.survey_id = p_survey_id
    and r.status = 'submitted'
    and a.answer_type in ('image_tag', 'participant_image_tag')
    and a.x_ratio between 0 and 1
    and a.y_ratio between 0 and 1
    and private.matches_analysis_profile_filters(r, p_filters)
    and private.matches_analysis_answer_filters(a, p_filters)
  order by a.created_at desc;
$$;

create or replace function public.get_text_answers(p_survey_id uuid, p_filters jsonb default '{}'::jsonb)
returns table(
  answer_id uuid,
  section_id uuid,
  question_id uuid,
  topic_key text,
  space_key text,
  text_value text,
  value_json jsonb,
  dormitory text,
  room_type text,
  rc text,
  department text,
  profile jsonb,
  created_at timestamptz
)
language sql
stable
set search_path to 'private', 'public'
as $$
  select
    a.id as answer_id,
    a.section_id,
    a.question_id,
    a.topic_key,
    a.space_key,
    a.text_value,
    coalesce(a.value_json, '{}'::jsonb) as value_json,
    r.dormitory,
    r.room_type,
    r.rc,
    r.department,
    jsonb_strip_nulls(jsonb_build_object(
      'gender', r.gender,
      'semesterGroup', r.semester_group,
      'department', r.department,
      'rc', r.rc,
      'dormitory', r.dormitory,
      'roomType', r.room_type,
      'dormExperience', r.dorm_experience
    )) as profile,
    a.created_at
  from public.answers a
  join public.responses r on r.id = a.response_id and r.survey_id = a.survey_id
  where a.survey_id = p_survey_id
    and r.status = 'submitted'
    and a.answer_type = 'text'
    and nullif(a.text_value, '') is not null
    and (nullif(p_filters->>'keyword', '') is null or a.text_value ilike '%' || (p_filters->>'keyword') || '%')
    and private.matches_analysis_profile_filters(r, p_filters)
    and private.matches_analysis_answer_filters(a, p_filters)
  order by a.created_at desc;
$$;

create or replace function public.get_text_groups(p_survey_id uuid, p_filters jsonb default '{}'::jsonb)
returns table(
  group_key text,
  label text,
  topic_key text,
  issue_type text,
  question_id uuid,
  count bigint,
  n bigint,
  representative_texts text[]
)
language sql
stable
set search_path to 'private', 'public'
as $$
  with answers as (
    select
      a.*,
      coalesce(
        nullif(a.value_json->>'issue_type', ''),
        nullif(a.value_json->>'category', ''),
        nullif(a.value_json->>'choiceValue', ''),
        nullif(a.topic_key, ''),
        nullif(a.space_key, ''),
        a.question_id::text,
        '기타/미분류'
      ) as group_key,
      row_number() over (
        partition by coalesce(
          nullif(a.value_json->>'issue_type', ''),
          nullif(a.value_json->>'category', ''),
          nullif(a.value_json->>'choiceValue', ''),
          nullif(a.topic_key, ''),
          nullif(a.space_key, ''),
          a.question_id::text,
          '기타/미분류'
        )
        order by a.created_at desc
      ) as representative_rank
    from public.answers a
    join public.responses r on r.id = a.response_id and r.survey_id = a.survey_id
    where a.survey_id = p_survey_id
      and r.status = 'submitted'
      and a.answer_type = 'text'
      and nullif(a.text_value, '') is not null
      and (nullif(p_filters->>'keyword', '') is null or a.text_value ilike '%' || (p_filters->>'keyword') || '%')
      and private.matches_analysis_profile_filters(r, p_filters)
      and private.matches_analysis_answer_filters(a, p_filters)
  )
  select
    group_key,
    group_key as label,
    max(topic_key) as topic_key,
    max(value_json->>'issue_type') as issue_type,
    max(question_id) as question_id,
    count(*)::bigint as count,
    count(*)::bigint as n,
    array_agg(text_value order by created_at desc) filter (where representative_rank <= 3) as representative_texts
  from answers
  group by group_key
  order by count(*) desc, group_key;
$$;
