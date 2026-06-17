-- 상세 명단(get_identity_responses)에 주의력 확인 미통과 응답도 포함한다.
-- 분석 집계 RPC와 쿼리는 그대로 passed_attention_check = true 만 사용하므로 분석에서는 계속 제외된다.
create or replace function public.get_identity_responses(p_survey_id uuid, p_filters jsonb default '{}'::jsonb)
returns table (
  response_id uuid,
  student_number text,
  name text,
  gender text,
  semester_group text,
  department text,
  rc text,
  dormitory text,
  room_type text,
  dorm_experience text,
  profile jsonb,
  submitted_at timestamptz,
  next_cursor text
)
language sql
stable
set search_path to 'private', 'public'
as $$
  with params as (
    select
      least(greatest(coalesce(nullif(p_filters->>'limit', '')::integer, 100), 1), 200) as page_size,
      private.analysis_cursor_created_at(nullif(p_filters->>'cursor', '')) as cursor_submitted_at,
      private.analysis_cursor_answer_id(nullif(p_filters->>'cursor', '')) as cursor_response_id
  ),
  identity_answers as (
    select
      r.id as response_id,
      r.gender,
      r.semester_group,
      r.department,
      r.rc,
      r.dormitory,
      r.room_type,
      r.dorm_experience,
      r.submitted_at,
      case
        when lower(coalesce(q.config->>'profileField', q.config->>'profile_field', '')) in ('student_number', 'studentnumber', 'student_id', 'studentid') then 'student_number'
        when lower(coalesce(q.config->>'profileField', q.config->>'profile_field', '')) in ('name', 'full_name', 'fullname') then 'name'
        when regexp_replace(lower(q.question_key), '[[:space:]_-]', '', 'g') like '%studentnumber%'
          or regexp_replace(lower(q.question_key), '[[:space:]_-]', '', 'g') like '%studentid%'
          or regexp_replace(lower(q.title_ko), '[[:space:]_-]', '', 'g') like '학번%'
          or regexp_replace(lower(coalesce(q.title_en, '')), '[[:space:]_-]', '', 'g') like '%studentid%' then 'student_number'
        when regexp_replace(lower(q.question_key), '[[:space:]_-]', '', 'g') = 'name'
          or regexp_replace(lower(q.question_key), '[[:space:]_-]', '', 'g') like '%name'
          or regexp_replace(lower(q.title_ko), '[[:space:]_-]', '', 'g') like '이름%'
          or regexp_replace(lower(coalesce(q.title_en, '')), '[[:space:]_-]', '', 'g') in ('name', 'fullname')
          or regexp_replace(lower(coalesce(q.title_en, '')), '[[:space:]_-]', '', 'g') like 'name%' then 'name'
        else null
      end as identity_key,
      nullif(coalesce(a.text_value, a.value_json->>'value', a.value_json->>'text', a.value_json->>'label', a.value_json->>'answer'), '') as identity_value
    from public.responses r
    join public.answers a on a.response_id = r.id and a.survey_id = r.survey_id
    join public.questions q on q.id = a.question_id and q.survey_id = r.survey_id
    cross join params p
    where r.survey_id = p_survey_id
      and r.status = 'submitted'
      and r.submitted_at is not null
      and (p.cursor_submitted_at is null or (r.submitted_at, r.id) < (p.cursor_submitted_at, p.cursor_response_id))
      and private.analysis_fact_matches_filters(
        r.gender, r.semester_group, r.department, r.rc, r.dormitory, r.room_type, r.dorm_experience,
        null, null, null, null, null, null, null, null, p_filters
      )
  ),
  grouped as (
    select
      response_id,
      max(identity_value) filter (where identity_key = 'student_number') as student_number,
      max(identity_value) filter (where identity_key = 'name') as name,
      max(gender) as gender,
      max(semester_group) as semester_group,
      max(department) as department,
      max(rc) as rc,
      max(dormitory) as dormitory,
      max(room_type) as room_type,
      max(dorm_experience) as dorm_experience,
      max(submitted_at) as submitted_at
    from identity_answers
    where identity_key in ('student_number', 'name')
      and identity_value is not null
    group by response_id
  ),
  rows as (
    select
      *,
      row_number() over (order by submitted_at desc, response_id desc) as rn
    from grouped
    where student_number is not null or name is not null
    order by submitted_at desc, response_id desc
    limit (select page_size + 1 from params)
  ),
  page_rows as (
    select *
    from rows
    where rn <= (select page_size from params)
  ),
  cursor_row as (
    select *
    from page_rows
    where (select count(*) from rows) > (select page_size from params)
    order by rn desc
    limit 1
  )
  select
    p.response_id,
    p.student_number,
    p.name,
    p.gender,
    p.semester_group,
    p.department,
    p.rc,
    p.dormitory,
    p.room_type,
    p.dorm_experience,
    jsonb_strip_nulls(jsonb_build_object(
      'gender', p.gender,
      'semesterGroup', p.semester_group,
      'department', p.department,
      'rc', p.rc,
      'dormitory', p.dormitory,
      'roomType', p.room_type,
      'dormExperience', p.dorm_experience
    )) as profile,
    p.submitted_at,
    case
      when c.response_id is null then null
      else c.submitted_at::text || '|' || c.response_id::text
    end as next_cursor
  from page_rows p
  left join cursor_row c on true
  order by p.submitted_at desc, p.response_id desc;
$$;

grant execute on function public.get_identity_responses(uuid, jsonb) to authenticated;
