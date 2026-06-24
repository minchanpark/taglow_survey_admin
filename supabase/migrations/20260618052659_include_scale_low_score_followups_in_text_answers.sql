-- 낮은 점수 후속 답변이 scale 답변의 value_json에 함께 저장된 경우에도
-- 점수 문항 분석 카드에서 질문별/카테고리별 후속 답변으로 조회할 수 있게 한다.
drop function if exists public.get_text_answers(uuid, jsonb);

create or replace function public.get_text_answers(p_survey_id uuid, p_filters jsonb default '{}'::jsonb)
returns table (
  answer_id uuid,
  response_id uuid,
  section_id uuid,
  section_title text,
  question_id uuid,
  question_title text,
  question_type text,
  topic_key text,
  space_key text,
  text_value text,
  value_json jsonb,
  dormitory text,
  room_type text,
  rc text,
  department text,
  profile jsonb,
  created_at timestamptz,
  total_count bigint,
  question_total_count bigint,
  next_cursor text
)
language sql
stable
set search_path to 'private', 'public'
as $$
  with params as (
    select
      least(greatest(coalesce(nullif(p_filters->>'limit', '')::integer, 50), 1), 100) as page_size,
      coalesce(nullif(p_filters->>'include_scale_followups', '')::boolean, false) as include_scale_followups,
      case
        when nullif(p_filters->>'question_id', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          then (p_filters->>'question_id')::uuid
        else null
      end as filter_question_id,
      private.analysis_cursor_created_at(nullif(p_filters->>'cursor', '')) as cursor_created_at,
      private.analysis_cursor_answer_id(nullif(p_filters->>'cursor', '')) as cursor_answer_id
  ),
  text_answers as (
    select
      a.answer_id,
      a.response_id,
      a.section_id,
      a.section_title,
      a.question_id,
      a.question_title,
      a.question_type,
      a.topic_key,
      a.space_key,
      a.text_value,
      a.value_json,
      a.gender,
      a.semester_group,
      a.dorm_experience,
      a.dormitory,
      a.room_type,
      a.rc,
      a.department,
      a.asset_id,
      a.tag_type,
      a.metric_type,
      a.created_at
    from public.analysis_answer_facts a
    cross join params p
    where a.survey_id = p_survey_id
      and a.passed_attention_check = true
      and a.answer_type = 'text'
      and nullif(a.text_value, '') is not null
      and (p.filter_question_id is null or a.question_id = p.filter_question_id)
  ),
  scale_followups as (
    select
      a.answer_id,
      a.response_id,
      a.section_id,
      a.section_title,
      a.question_id,
      a.question_title,
      a.question_type,
      a.topic_key,
      a.space_key,
      coalesce(nullif(a.value_json->>'low_score_text', ''), nullif(a.value_json->>'low_score_reason', '')) as text_value,
      jsonb_strip_nulls(
        coalesce(a.value_json, '{}'::jsonb)
        || jsonb_build_object(
          'lowScoreFollowUp', true,
          'category', nullif(a.value_json->>'low_score_reason', ''),
          'choiceValue', nullif(a.value_json->>'low_score_reason', ''),
          'text', nullif(a.value_json->>'low_score_text', ''),
          'sourceAnswerType', 'scale'
        )
      ) as value_json,
      a.gender,
      a.semester_group,
      a.dorm_experience,
      a.dormitory,
      a.room_type,
      a.rc,
      a.department,
      a.asset_id,
      a.tag_type,
      a.metric_type,
      a.created_at
    from public.analysis_answer_facts a
    cross join params p
    where p.include_scale_followups
      and a.survey_id = p_survey_id
      and a.passed_attention_check = true
      and a.answer_type = 'scale'
      and (p.filter_question_id is null or a.question_id = p.filter_question_id)
      and (
        nullif(a.value_json->>'low_score_text', '') is not null
        or nullif(a.value_json->>'low_score_reason', '') is not null
      )
  ),
  all_answers as (
    select * from text_answers
    union all
    select * from scale_followups
  ),
  filtered as (
    select
      a.*,
      count(*) over () as total_count,
      count(*) over (
        partition by coalesce(a.question_id::text, coalesce(a.section_id::text, 'section') || ':' || coalesce(a.topic_key, a.space_key, 'unclassified'))
      ) as question_total_count
    from all_answers a
    where private.analysis_fact_matches_filters(
      a.gender, a.semester_group, a.department, a.rc, a.dormitory, a.room_type, a.dorm_experience,
      a.section_id, a.question_id, a.asset_id, a.topic_key, a.space_key, a.tag_type, a.metric_type, a.text_value, p_filters
    )
  ),
  rows as (
    select
      f.*,
      row_number() over (order by f.created_at desc, f.answer_id desc) as rn
    from filtered f
    cross join params p
    where p.cursor_created_at is null or (f.created_at, f.answer_id) < (p.cursor_created_at, p.cursor_answer_id)
    order by f.created_at desc, f.answer_id desc
    limit (select page_size + 1 from params)
  ),
  page_rows as (
    select *
    from rows
    where rn <= (select page_size from params)
  ),
  cursor_row as (
    select private.analysis_next_cursor(p_created_at := created_at, p_answer_id := answer_id) as cursor_value
    from page_rows
    order by created_at asc, answer_id asc
    limit 1
  )
  select
    a.answer_id,
    a.response_id,
    a.section_id,
    a.section_title,
    a.question_id,
    a.question_title,
    a.question_type,
    a.topic_key,
    a.space_key,
    a.text_value,
    a.value_json,
    a.dormitory,
    a.room_type,
    a.rc,
    a.department,
    private.analysis_response_profile_json(a.gender, a.semester_group, a.department, a.rc, a.dormitory, a.room_type, a.dorm_experience) as profile,
    a.created_at,
    a.total_count,
    a.question_total_count,
    case when (select count(*) from rows) > (select page_size from params) then (select cursor_value from cursor_row) end as next_cursor
  from page_rows a
  order by a.created_at desc, a.answer_id desc;
$$;

grant execute on function public.get_text_answers(uuid, jsonb) to authenticated;

create index if not exists idx_analysis_answer_facts_scale_low_score_followups
on public.analysis_answer_facts (survey_id, created_at desc, answer_id)
where answer_type = 'scale'
  and (
    nullif(value_json->>'low_score_text', '') is not null
    or nullif(value_json->>'low_score_reason', '') is not null
  );

create index if not exists idx_analysis_answer_facts_scale_low_score_followups_question
on public.analysis_answer_facts (survey_id, question_id, created_at desc, answer_id)
where answer_type = 'scale'
  and (
    nullif(value_json->>'low_score_text', '') is not null
    or nullif(value_json->>'low_score_reason', '') is not null
  );
