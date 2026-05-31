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
    and a.metric_type in ('satisfaction', 'importance')
    and a.score_value is not null
    and private.matches_analysis_profile_filters(r, p_filters)
    and private.matches_analysis_answer_filters(a, p_filters)
  group by a.question_id, q.title_ko, a.section_id, s.title_ko, a.topic_key, a.metric_type
  order by
    case a.metric_type when 'satisfaction' then 1 when 'importance' then 2 else 3 end,
    avg_score asc nulls last,
    n desc,
    question_title;
$$;
