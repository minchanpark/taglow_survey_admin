create or replace function private.analysis_scale_max(p_config jsonb)
returns integer
language sql
immutable
as $$
  select case
    when coalesce(p_config->>'scaleMax', '') ~ '^[0-9]+$' then (p_config->>'scaleMax')::integer
    when coalesce(p_config->>'scale_max', '') ~ '^[0-9]+$' then (p_config->>'scale_max')::integer
    else null
  end;
$$;

create or replace function private.analysis_score_for_average(
  p_score numeric,
  p_metric_type text,
  p_question_config jsonb
)
returns numeric
language sql
immutable
as $$
  select case
    when p_score is null then null
    when coalesce(p_metric_type, '') = 'importance' then p_score
    when coalesce(private.analysis_scale_max(coalesce(p_question_config, '{}'::jsonb)), 5) >= 7 then
      case when p_score between 2 and 6 then p_score - 1 else null end
    else p_score
  end;
$$;

create or replace function public.get_section_satisfaction_summary(p_survey_id uuid, p_filters jsonb default '{}'::jsonb)
returns table (
  section_id uuid,
  section_title text,
  avg_score numeric,
  n bigint
)
language sql
stable
set search_path to 'private', 'public'
as $$
  select
    a.section_id,
    max(coalesce(a.section_title, s.title_ko)) as section_title,
    round(avg(scored.score), 2) as avg_score,
    count(*)::bigint as n
  from public.analysis_answer_facts a
  join public.questions q on q.id = a.question_id and q.survey_id = a.survey_id
  left join public.survey_sections s on s.id = a.section_id and s.survey_id = a.survey_id
  cross join lateral (
    select private.analysis_score_for_average(a.score_value, a.metric_type, q.config) as score
  ) scored
  where a.survey_id = p_survey_id
    and a.passed_attention_check = true
    and a.answer_type = 'scale'
    and a.metric_type = 'satisfaction'
    and scored.score is not null
    and private.analysis_fact_matches_filters(
      a.gender, a.semester_group, a.department, a.rc, a.dormitory, a.room_type, a.dorm_experience,
      a.section_id, a.question_id, a.asset_id, a.topic_key, a.space_key, a.tag_type, a.metric_type, a.text_value, p_filters
    )
  group by a.section_id
  order by max(s.order_index) nulls last, section_title;
$$;

create or replace function public.get_question_satisfaction_summary(p_survey_id uuid, p_filters jsonb default '{}'::jsonb)
returns table (
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
    max(coalesce(a.question_title, q.title_ko)) as question_title,
    a.section_id,
    max(coalesce(a.section_title, s.title_ko)) as section_title,
    a.topic_key,
    a.metric_type,
    round(avg(scored.score), 2) as avg_score,
    coalesce(round(stddev_samp(scored.score), 2), 0) as stddev_score,
    count(*)::bigint as n
  from public.analysis_answer_facts a
  join public.questions q on q.id = a.question_id and q.survey_id = a.survey_id
  left join public.survey_sections s on s.id = a.section_id and s.survey_id = a.survey_id
  cross join lateral (
    select private.analysis_score_for_average(a.score_value, a.metric_type, q.config) as score
  ) scored
  where a.survey_id = p_survey_id
    and a.passed_attention_check = true
    and a.answer_type = 'scale'
    and a.metric_type <> 'importance'
    and scored.score is not null
    and private.analysis_fact_matches_filters(
      a.gender, a.semester_group, a.department, a.rc, a.dormitory, a.room_type, a.dorm_experience,
      a.section_id, a.question_id, a.asset_id, a.topic_key, a.space_key, a.tag_type, a.metric_type, a.text_value, p_filters
    )
  group by a.question_id, a.section_id, a.topic_key, a.metric_type
  order by max(s.order_index) nulls last, max(q.order_index) nulls last, question_title;
$$;

create or replace function public.get_group_compare_summary(p_survey_id uuid, p_filters jsonb default '{}'::jsonb)
returns table (
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
  with grouped as (
    select
      case coalesce(nullif(p_filters->>'group_by', ''), 'dormitory')
        when 'gender' then a.gender
        when 'semester_group' then a.semester_group
        when 'department' then a.department
        when 'rc' then a.rc
        when 'dormitory' then a.dormitory
        when 'room_type' then a.room_type
        when 'dorm_experience' then a.dorm_experience
        else a.dormitory
      end as group_value,
      round(avg(scored.score), 2) as avg_score,
      count(*)::bigint as n
    from public.analysis_answer_facts a
    join public.questions q on q.id = a.question_id and q.survey_id = a.survey_id
    cross join lateral (
      select private.analysis_score_for_average(a.score_value, a.metric_type, q.config) as score
    ) scored
    where a.survey_id = p_survey_id
      and a.passed_attention_check = true
      and a.answer_type = 'scale'
      and a.metric_type = coalesce(nullif(p_filters->>'metric_type', ''), 'satisfaction')
      and scored.score is not null
      and private.analysis_fact_matches_filters(
        a.gender, a.semester_group, a.department, a.rc, a.dormitory, a.room_type, a.dorm_experience,
        a.section_id, a.question_id, a.asset_id, a.topic_key, a.space_key, a.tag_type, a.metric_type, a.text_value, p_filters
      )
    group by group_value
  ),
  ranked as (
    select
      coalesce(nullif(group_value, ''), '기타/미분류') as group_key,
      coalesce(nullif(group_value, ''), '기타/미분류') as group_label,
      avg_score,
      n,
      avg_score = max(avg_score) over () as is_highest,
      avg_score = min(avg_score) over () as is_lowest
    from grouped
  )
  select group_key, group_label, avg_score, n, is_highest, is_lowest, n > 0 and n < 10 as is_low_sample
  from ranked
  order by avg_score asc nulls last, group_label;
$$;

create or replace function public.get_borich_summary(p_survey_id uuid, p_filters jsonb default '{}'::jsonb)
returns table (
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
  with scored_answers as (
    select
      a.response_id,
      a.topic_key,
      a.metric_type,
      private.analysis_score_for_average(a.score_value, a.metric_type, q.config) as score
    from public.analysis_answer_facts a
    join public.questions q on q.id = a.question_id and q.survey_id = a.survey_id
    where a.survey_id = p_survey_id
      and a.passed_attention_check = true
      and a.answer_type = 'scale'
      and a.metric_type in ('importance', 'satisfaction')
      and a.topic_key is not null
      and private.analysis_fact_matches_filters(
        a.gender, a.semester_group, a.department, a.rc, a.dormitory, a.room_type, a.dorm_experience,
        a.section_id, a.question_id, a.asset_id, a.topic_key, a.space_key, a.tag_type, a.metric_type, a.text_value, p_filters
      )
  ),
  pairs as (
    select
      response_id,
      topic_key,
      avg(score) filter (where metric_type = 'importance') as importance,
      avg(score) filter (where metric_type = 'satisfaction') as satisfaction
    from scored_answers
    where score is not null
    group by response_id, topic_key
  ),
  complete_pairs as (
    select *
    from pairs
    where importance is not null and satisfaction is not null
  )
  select
    complete_pairs.topic_key,
    round(avg(importance)::numeric, 2) as avg_importance,
    round(avg(satisfaction)::numeric, 2) as avg_satisfaction,
    round((avg(importance) - avg(satisfaction))::numeric, 2) as avg_gap,
    round((avg(importance) * (avg(importance) - avg(satisfaction)))::numeric, 2) as borich_score,
    count(*)::bigint as n
  from complete_pairs
  group by complete_pairs.topic_key
  order by borich_score desc nulls last, n desc;
$$;

create or replace function public.get_locus_summary(p_survey_id uuid, p_filters jsonb default '{}'::jsonb)
returns table (
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
returns table (
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
      coalesce(a.topic_key, a.question_id::text) as key,
      max(coalesce(a.question_title, a.topic_key, a.question_id::text)) as label,
      max(a.topic_key) as topic_key,
      max(a.section_title) as section_title,
      round(avg(scored.score), 2) as avg_satisfaction,
      count(*)::bigint as n_satisfaction
    from public.analysis_answer_facts a
    join public.questions q on q.id = a.question_id and q.survey_id = a.survey_id
    cross join lateral (
      select private.analysis_score_for_average(a.score_value, a.metric_type, q.config) as score
    ) scored
    where a.survey_id = p_survey_id
      and a.passed_attention_check = true
      and a.answer_type = 'scale'
      and a.metric_type = 'satisfaction'
      and scored.score is not null
      and private.analysis_fact_matches_filters(
        a.gender, a.semester_group, a.department, a.rc, a.dormitory, a.room_type, a.dorm_experience,
        a.section_id, a.question_id, a.asset_id, a.topic_key, a.space_key, a.tag_type, a.metric_type, a.text_value, p_filters
      )
    group by coalesce(a.topic_key, a.question_id::text)
  ),
  importance as (
    select
      coalesce(a.topic_key, a.question_id::text) as key,
      round(avg(scored.score), 2) as avg_importance,
      count(*)::bigint as n_importance
    from public.analysis_answer_facts a
    join public.questions q on q.id = a.question_id and q.survey_id = a.survey_id
    cross join lateral (
      select private.analysis_score_for_average(a.score_value, a.metric_type, q.config) as score
    ) scored
    where a.survey_id = p_survey_id
      and a.passed_attention_check = true
      and a.answer_type = 'scale'
      and a.metric_type = 'importance'
      and scored.score is not null
      and private.analysis_fact_matches_filters(
        a.gender, a.semester_group, a.department, a.rc, a.dormitory, a.room_type, a.dorm_experience,
        a.section_id, a.question_id, a.asset_id, a.topic_key, a.space_key, a.tag_type, a.metric_type, a.text_value, p_filters
      )
    group by coalesce(a.topic_key, a.question_id::text)
  ),
  text_counts as (
    select coalesce(a.topic_key, a.question_id::text) as key, count(*)::bigint as text_count
    from public.analysis_answer_facts a
    where a.survey_id = p_survey_id
      and a.passed_attention_check = true
      and a.answer_type = 'text'
      and nullif(a.text_value, '') is not null
      and private.analysis_fact_matches_filters(
        a.gender, a.semester_group, a.department, a.rc, a.dormitory, a.room_type, a.dorm_experience,
        a.section_id, a.question_id, a.asset_id, a.topic_key, a.space_key, a.tag_type, a.metric_type, a.text_value, p_filters
      )
    group by coalesce(a.topic_key, a.question_id::text)
  ),
  tag_counts as (
    select coalesce(a.topic_key, a.question_id::text) as key, count(*)::bigint as tag_count
    from public.analysis_answer_facts a
    where a.survey_id = p_survey_id
      and a.passed_attention_check = true
      and a.answer_type in ('image_tag', 'participant_image_tag')
      and private.analysis_fact_matches_filters(
        a.gender, a.semester_group, a.department, a.rc, a.dormitory, a.room_type, a.dorm_experience,
        a.section_id, a.question_id, a.asset_id, a.topic_key, a.space_key, a.tag_type, a.metric_type, a.text_value, p_filters
      )
    group by coalesce(a.topic_key, a.question_id::text)
  ),
  keys as (
    select key from satisfaction
    union
    select key from importance
    union
    select key from text_counts
    union
    select key from tag_counts
  ),
  combined as (
    select
      keys.key,
      coalesce(satisfaction.label, keys.key) as label,
      satisfaction.topic_key,
      satisfaction.section_title,
      importance.avg_importance,
      satisfaction.avg_satisfaction,
      greatest(coalesce(satisfaction.n_satisfaction, 0), coalesce(importance.n_importance, 0))::bigint as scale_n,
      coalesce(text_counts.text_count, 0)::bigint as text_count,
      coalesce(tag_counts.tag_count, 0)::bigint as tag_count
    from keys
    left join satisfaction on satisfaction.key = keys.key
    left join importance on importance.key = keys.key
    left join text_counts on text_counts.key = keys.key
    left join tag_counts on tag_counts.key = keys.key
  )
  select
    key as id,
    label,
    case
      when avg_importance is not null and avg_satisfaction is not null and (text_count > 0 or tag_count > 0) then 'mixed'
      when avg_importance is not null and avg_satisfaction is not null then 'borich'
      when tag_count > 0 and avg_satisfaction is null then 'heatmap'
      when text_count > 0 and avg_satisfaction is null then 'text'
      else 'low_satisfaction'
    end as source,
    topic_key,
    section_title,
    avg_importance,
    avg_satisfaction,
    case when avg_importance is not null and avg_satisfaction is not null then round((avg_importance - avg_satisfaction)::numeric, 2) end as avg_gap,
    case when avg_importance is not null and avg_satisfaction is not null then round((avg_importance * greatest(0, avg_importance - avg_satisfaction))::numeric, 2) end as borich_score,
    text_count,
    tag_count,
    greatest(scale_n, text_count, tag_count)::bigint as n
  from combined
  order by
    coalesce(
      case when avg_importance is not null and avg_satisfaction is not null then avg_importance * greatest(0, avg_importance - avg_satisfaction) end,
      0
    )
      + greatest(0, 5 - coalesce(avg_satisfaction, 5)) * 1.25
      + (text_count * 0.08)
      + (tag_count * 0.08) desc,
    n desc,
    label
  limit 5;
$$;

notify pgrst, 'reload schema';
