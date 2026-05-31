drop function if exists public.get_priority_top5(uuid, jsonb);

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
set search_path to 'public'
as $$
  with scale_answers as (
    select
      a.*,
      coalesce(
        nullif(a.topic_key, '') || coalesce(':' || nullif(a.space_key, ''), ''),
        a.section_id::text,
        a.question_id::text
      ) as priority_key
    from public.answers a
    join public.responses r on r.id = a.response_id and r.survey_id = a.survey_id
    where a.survey_id = p_survey_id
      and r.status = 'submitted'
      and a.answer_type = 'scale'
      and a.score_value is not null
      and (nullif(p_filters->>'gender', '') is null or r.gender = p_filters->>'gender')
      and (nullif(p_filters->>'semester_group', '') is null or r.semester_group = p_filters->>'semester_group')
      and (nullif(p_filters->>'department', '') is null or r.department = p_filters->>'department')
      and (nullif(p_filters->>'rc', '') is null or r.rc = p_filters->>'rc')
      and (nullif(p_filters->>'dormitory', '') is null or r.dormitory = p_filters->>'dormitory')
      and (nullif(p_filters->>'room_type', '') is null or r.room_type = p_filters->>'room_type')
      and (nullif(p_filters->>'dorm_experience', '') is null or r.dorm_experience = p_filters->>'dorm_experience')
      and (nullif(p_filters->>'section_id', '') is null or a.section_id::text = p_filters->>'section_id')
      and (nullif(p_filters->>'topic_key', '') is null or a.topic_key = p_filters->>'topic_key')
      and (nullif(p_filters->>'space_key', '') is null or a.space_key = p_filters->>'space_key')
  ),
  satisfaction as (
    select
      priority_key,
      avg(score_value) as avg_satisfaction,
      count(*)::bigint as n_satisfaction
    from scale_answers
    where metric_type = 'satisfaction'
    group by priority_key
  ),
  importance as (
    select
      priority_key,
      avg(score_value) as avg_importance,
      count(*)::bigint as n_importance
    from scale_answers
    where metric_type = 'importance'
    group by priority_key
  ),
  question_labels as (
    select
      coalesce(
        nullif(q.topic_key, '') || coalesce(':' || nullif(q.space_key, ''), ''),
        q.section_id::text,
        q.id::text
      ) as priority_key,
      (array_agg(
        coalesce(nullif(q.config->>'displayGroup', ''), s.title_ko, q.title_ko)
        order by
          case
            when q.question_type = 'scale' then 0
            when q.question_type = 'text' then 1
            else 2
          end,
          case q.metric_type when 'satisfaction' then 0 when 'importance' then 1 else 2 end,
          q.order_index
      ))[1] as label,
      (array_agg(nullif(q.topic_key, '') order by q.order_index))[1] as topic_key,
      (array_agg(s.title_ko order by q.order_index))[1] as section_title
    from public.questions q
    left join public.survey_sections s on s.id = q.section_id
    where q.survey_id = p_survey_id
    group by coalesce(
      nullif(q.topic_key, '') || coalesce(':' || nullif(q.space_key, ''), ''),
      q.section_id::text,
      q.id::text
    )
  ),
  text_counts as (
    select
      coalesce(
        nullif(a.topic_key, '') || coalesce(':' || nullif(a.space_key, ''), ''),
        a.section_id::text,
        a.question_id::text
      ) as priority_key,
      count(*)::bigint as text_count
    from public.answers a
    join public.responses r on r.id = a.response_id and r.survey_id = a.survey_id
    where a.survey_id = p_survey_id
      and r.status = 'submitted'
      and a.answer_type = 'text'
      and nullif(a.text_value, '') is not null
      and (nullif(p_filters->>'gender', '') is null or r.gender = p_filters->>'gender')
      and (nullif(p_filters->>'semester_group', '') is null or r.semester_group = p_filters->>'semester_group')
      and (nullif(p_filters->>'department', '') is null or r.department = p_filters->>'department')
      and (nullif(p_filters->>'rc', '') is null or r.rc = p_filters->>'rc')
      and (nullif(p_filters->>'dormitory', '') is null or r.dormitory = p_filters->>'dormitory')
      and (nullif(p_filters->>'room_type', '') is null or r.room_type = p_filters->>'room_type')
      and (nullif(p_filters->>'dorm_experience', '') is null or r.dorm_experience = p_filters->>'dorm_experience')
      and (nullif(p_filters->>'section_id', '') is null or a.section_id::text = p_filters->>'section_id')
      and (nullif(p_filters->>'topic_key', '') is null or a.topic_key = p_filters->>'topic_key')
      and (nullif(p_filters->>'space_key', '') is null or a.space_key = p_filters->>'space_key')
    group by coalesce(
      nullif(a.topic_key, '') || coalesce(':' || nullif(a.space_key, ''), ''),
      a.section_id::text,
      a.question_id::text
    )
  ),
  tag_counts as (
    select
      coalesce(
        nullif(a.topic_key, '') || coalesce(':' || nullif(a.space_key, ''), ''),
        a.asset_id::text,
        a.question_id::text
      ) as priority_key,
      count(*)::bigint as tag_count,
      avg(a.severity) as avg_severity
    from public.answers a
    join public.responses r on r.id = a.response_id and r.survey_id = a.survey_id
    where a.survey_id = p_survey_id
      and r.status = 'submitted'
      and a.answer_type in ('image_tag', 'participant_image_tag')
      and (nullif(p_filters->>'gender', '') is null or r.gender = p_filters->>'gender')
      and (nullif(p_filters->>'semester_group', '') is null or r.semester_group = p_filters->>'semester_group')
      and (nullif(p_filters->>'department', '') is null or r.department = p_filters->>'department')
      and (nullif(p_filters->>'rc', '') is null or r.rc = p_filters->>'rc')
      and (nullif(p_filters->>'dormitory', '') is null or r.dormitory = p_filters->>'dormitory')
      and (nullif(p_filters->>'room_type', '') is null or r.room_type = p_filters->>'room_type')
      and (nullif(p_filters->>'dorm_experience', '') is null or r.dorm_experience = p_filters->>'dorm_experience')
      and (nullif(p_filters->>'section_id', '') is null or a.section_id::text = p_filters->>'section_id')
      and (nullif(p_filters->>'topic_key', '') is null or a.topic_key = p_filters->>'topic_key')
      and (nullif(p_filters->>'space_key', '') is null or a.space_key = p_filters->>'space_key')
      and (nullif(p_filters->>'asset_id', '') is null or a.asset_id::text = p_filters->>'asset_id')
      and (nullif(p_filters->>'tag_type', '') is null or a.tag_type = p_filters->>'tag_type')
    group by coalesce(
      nullif(a.topic_key, '') || coalesce(':' || nullif(a.space_key, ''), ''),
      a.asset_id::text,
      a.question_id::text
    )
  ),
  keys as (
    select priority_key from satisfaction
    union
    select priority_key from importance
    union
    select priority_key from text_counts
    union
    select priority_key from tag_counts
  ),
  merged as (
    select
      keys.priority_key,
      labels.label,
      labels.topic_key,
      labels.section_title,
      satisfaction.avg_satisfaction,
      satisfaction.n_satisfaction,
      importance.avg_importance,
      importance.n_importance,
      case
        when importance.avg_importance is not null and satisfaction.avg_satisfaction is not null
          then importance.avg_importance - satisfaction.avg_satisfaction
        else null
      end as avg_gap,
      case
        when importance.avg_importance is not null and satisfaction.avg_satisfaction is not null
          then importance.avg_importance * greatest(0, importance.avg_importance - satisfaction.avg_satisfaction)
        else null
      end as borich_score,
      coalesce(text_counts.text_count, 0)::bigint as text_count,
      coalesce(tag_counts.tag_count, 0)::bigint as tag_count,
      coalesce(tag_counts.avg_severity, 0) as avg_severity
    from keys
    left join satisfaction on satisfaction.priority_key = keys.priority_key
    left join importance on importance.priority_key = keys.priority_key
    left join text_counts on text_counts.priority_key = keys.priority_key
    left join tag_counts on tag_counts.priority_key = keys.priority_key
    left join question_labels labels on labels.priority_key = keys.priority_key
  ),
  scored as (
    select
      *,
      coalesce(borich_score, 0)
        + (greatest(0, 5 - coalesce(avg_satisfaction, 5)) * 1.25)
        + (coalesce(avg_importance, 0) * 0.2)
        + (text_count * 0.08)
        + (tag_count * 0.12)
        + (avg_severity * 0.15) as priority_score
    from merged
  )
  select
    priority_key as id,
    coalesce(label, topic_key, priority_key) as label,
    case
      when borich_score is not null and (text_count > 0 or tag_count > 0) then 'mixed'
      when borich_score is not null then 'borich'
      when tag_count > 0 and avg_satisfaction is null then 'heatmap'
      when text_count > 0 and avg_satisfaction is null then 'text'
      else 'low_satisfaction'
    end as source,
    topic_key,
    section_title,
    round(avg_importance::numeric, 2) as avg_importance,
    round(avg_satisfaction::numeric, 2) as avg_satisfaction,
    round(avg_gap::numeric, 2) as avg_gap,
    round(borich_score::numeric, 2) as borich_score,
    text_count,
    tag_count,
    greatest(coalesce(n_satisfaction, 0), coalesce(n_importance, 0), text_count, tag_count)::bigint as n
  from scored
  where priority_key is not null
  order by priority_score desc nulls last, n desc, label
  limit 5;
$$;
