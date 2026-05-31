alter table public.responses
add column if not exists client_submission_id text,
add column if not exists passed_attention_check boolean,
add column if not exists attention_check_results jsonb not null default '[]'::jsonb;

create index if not exists idx_responses_client_submission
on public.responses (survey_id, participant_user_id, client_submission_id)
where client_submission_id is not null;

create index if not exists idx_responses_passed_attention
on public.responses (survey_id, status, passed_attention_check, submitted_at desc);

create table if not exists public.analysis_response_facts (
  response_id uuid primary key references public.responses(id) on delete cascade,
  survey_id uuid not null references public.surveys(id) on delete cascade,
  participant_user_id uuid,
  status text not null,
  submitted_at timestamptz,
  gender text,
  semester_group text,
  department text,
  rc text,
  dormitory text,
  room_type text,
  dorm_experience text,
  profile_json jsonb not null default '{}'::jsonb,
  passed_attention_check boolean not null default true,
  attention_check_results jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.analysis_answer_facts (
  answer_id uuid primary key references public.answers(id) on delete cascade,
  survey_id uuid not null references public.surveys(id) on delete cascade,
  response_id uuid not null references public.responses(id) on delete cascade,
  section_id uuid,
  question_id uuid,
  asset_id uuid,
  answer_type text not null,
  metric_type text not null default 'none',
  topic_key text,
  space_key text,
  score_value numeric,
  text_value text,
  choice_value text,
  x_ratio numeric,
  y_ratio numeric,
  tag_type text,
  severity smallint,
  value_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null,
  response_submitted_at timestamptz,
  gender text,
  semester_group text,
  department text,
  rc text,
  dormitory text,
  room_type text,
  dorm_experience text,
  passed_attention_check boolean not null default true,
  question_type text,
  question_title text,
  section_title text,
  updated_at timestamptz not null default now()
);

alter table public.analysis_response_facts enable row level security;
alter table public.analysis_answer_facts enable row level security;

grant select on public.analysis_response_facts to authenticated;
grant select on public.analysis_answer_facts to authenticated;

drop policy if exists "analysis response facts can be read by survey access" on public.analysis_response_facts;
create policy "analysis response facts can be read by survey access"
on public.analysis_response_facts
for select
to authenticated
using (survey_id in (select private.current_accessible_survey_ids()));

drop policy if exists "analysis answer facts can be read by survey access" on public.analysis_answer_facts;
create policy "analysis answer facts can be read by survey access"
on public.analysis_answer_facts
for select
to authenticated
using (survey_id in (select private.current_accessible_survey_ids()));

create index if not exists idx_analysis_response_facts_filters
on public.analysis_response_facts (survey_id, status, passed_attention_check, gender, semester_group, department, rc, dormitory, room_type, dorm_experience);

create index if not exists idx_analysis_answer_facts_question
on public.analysis_answer_facts (survey_id, answer_type, question_id);

create index if not exists idx_analysis_answer_facts_metric_section
on public.analysis_answer_facts (survey_id, metric_type, section_id)
where answer_type = 'scale';

create index if not exists idx_analysis_answer_facts_topic_space
on public.analysis_answer_facts (survey_id, topic_key, space_key);

create index if not exists idx_analysis_answer_facts_created
on public.analysis_answer_facts (survey_id, created_at desc);

create index if not exists idx_analysis_answer_facts_profile
on public.analysis_answer_facts (survey_id, passed_attention_check, gender, semester_group, department, rc, dormitory, room_type, dorm_experience);

create index if not exists idx_analysis_answer_facts_text
on public.analysis_answer_facts (survey_id, created_at desc, answer_id)
where answer_type = 'text' and text_value is not null;

create index if not exists idx_analysis_answer_facts_image
on public.analysis_answer_facts (survey_id, created_at desc, answer_id)
where answer_type in ('image_tag', 'participant_image_tag');

create or replace function private.analysis_fact_matches_filters(
  p_gender text,
  p_semester_group text,
  p_department text,
  p_rc text,
  p_dormitory text,
  p_room_type text,
  p_dorm_experience text,
  p_section_id uuid,
  p_question_id uuid,
  p_asset_id uuid,
  p_topic_key text,
  p_space_key text,
  p_tag_type text,
  p_metric_type text,
  p_text_value text,
  p_filters jsonb default '{}'::jsonb
)
returns boolean
language sql
stable
set search_path to 'private', 'public'
as $$
  select
    (nullif(p_filters->>'gender', '') is null or p_gender = p_filters->>'gender')
    and (nullif(p_filters->>'semester_group', '') is null or p_semester_group = p_filters->>'semester_group')
    and (nullif(p_filters->>'department', '') is null or p_department = p_filters->>'department')
    and (nullif(p_filters->>'rc', '') is null or p_rc = p_filters->>'rc')
    and (nullif(p_filters->>'dormitory', '') is null or p_dormitory = p_filters->>'dormitory')
    and (nullif(p_filters->>'room_type', '') is null or p_room_type = p_filters->>'room_type')
    and (nullif(p_filters->>'dorm_experience', '') is null or p_dorm_experience = p_filters->>'dorm_experience')
    and (
      nullif(p_filters->>'section_id', '') is null
      or (
        (p_filters->>'section_id') ~* '^[0-9a-f-]{36}$'
        and p_section_id = (p_filters->>'section_id')::uuid
      )
    )
    and case
      when nullif(p_filters->>'target_kind', '') = 'section' then
        (p_filters->>'target_id') ~* '^[0-9a-f-]{36}$' and p_section_id = (p_filters->>'target_id')::uuid
      when nullif(p_filters->>'target_kind', '') = 'question' then
        (p_filters->>'target_id') ~* '^[0-9a-f-]{36}$' and p_question_id = (p_filters->>'target_id')::uuid
      when nullif(p_filters->>'target_kind', '') = 'topic' then
        p_topic_key = nullif(p_filters->>'target_id', '')
      else true
    end
    and (nullif(p_filters->>'topic_key', '') is null or p_topic_key = p_filters->>'topic_key')
    and (nullif(p_filters->>'space_key', '') is null or p_space_key = p_filters->>'space_key')
    and (
      nullif(p_filters->>'asset_id', '') is null
      or (
        (p_filters->>'asset_id') ~* '^[0-9a-f-]{36}$'
        and p_asset_id = (p_filters->>'asset_id')::uuid
      )
    )
    and (nullif(p_filters->>'tag_type', '') is null or p_tag_type = p_filters->>'tag_type')
    and (nullif(p_filters->>'metric_type', '') is null or p_metric_type = p_filters->>'metric_type')
    and (nullif(p_filters->>'keyword', '') is null or coalesce(p_text_value, '') ilike '%' || (p_filters->>'keyword') || '%');
$$;

create or replace function private.analysis_cursor_created_at(p_cursor text)
returns timestamptz
language sql
stable
as $$
  select nullif(split_part(coalesce(p_cursor, ''), '|', 1), '')::timestamptz;
$$;

create or replace function private.analysis_cursor_answer_id(p_cursor text)
returns uuid
language sql
stable
as $$
  select nullif(split_part(coalesce(p_cursor, ''), '|', 2), '')::uuid;
$$;

create or replace function private.analysis_next_cursor(p_created_at timestamptz, p_answer_id uuid)
returns text
language sql
stable
as $$
  select p_created_at::text || '|' || p_answer_id::text;
$$;

create or replace function private.analysis_response_profile_json(
  p_gender text,
  p_semester_group text,
  p_department text,
  p_rc text,
  p_dormitory text,
  p_room_type text,
  p_dorm_experience text
)
returns jsonb
language sql
immutable
as $$
  select jsonb_strip_nulls(jsonb_build_object(
    'gender', p_gender,
    'semesterGroup', p_semester_group,
    'department', p_department,
    'rc', p_rc,
    'dormitory', p_dormitory,
    'roomType', p_room_type,
    'dormExperience', p_dorm_experience
  ));
$$;

create or replace function private.analysis_compute_attention_results(p_response_id uuid)
returns jsonb
language sql
stable
security definer
set search_path to 'private', 'public'
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'questionId', q.id::text,
        'expected', private.analysis_attention_expected_value(q),
        'passed', exists (
          select 1
          from public.answers a
          where a.response_id = p_response_id
            and a.survey_id = q.survey_id
            and a.question_id = q.id
            and private.analysis_answer_matches_expected(a, q, private.analysis_attention_expected_value(q))
        )
      )
      order by q.order_index
    ),
    '[]'::jsonb
  )
  from public.responses r
  join public.questions q on q.survey_id = r.survey_id
  where r.id = p_response_id
    and private.is_analysis_attention_check_question(q);
$$;

create or replace function private.analysis_passed_from_results(p_results jsonb)
returns boolean
language sql
immutable
as $$
  select not exists (
    select 1
    from jsonb_array_elements(coalesce(p_results, '[]'::jsonb)) item
    where coalesce((item->>'passed')::boolean, false) = false
  );
$$;

create or replace function private.upsert_analysis_facts_for_response(p_response_id uuid)
returns void
language plpgsql
security definer
set search_path to 'private', 'public'
as $$
declare
  v_response public.responses%rowtype;
  v_results jsonb;
  v_passed boolean;
begin
  select *
  into v_response
  from public.responses
  where id = p_response_id;

  if not found then
    raise exception 'Response not found.'
      using errcode = 'P0002';
  end if;

  v_results := coalesce(v_response.attention_check_results, private.analysis_compute_attention_results(p_response_id));
  v_passed := coalesce(v_response.passed_attention_check, private.analysis_passed_from_results(v_results));

  update public.responses
  set
    passed_attention_check = v_passed,
    attention_check_results = v_results
  where id = p_response_id
    and (passed_attention_check is distinct from v_passed or attention_check_results is distinct from v_results);

  insert into public.analysis_response_facts (
    response_id,
    survey_id,
    participant_user_id,
    status,
    submitted_at,
    gender,
    semester_group,
    department,
    rc,
    dormitory,
    room_type,
    dorm_experience,
    profile_json,
    passed_attention_check,
    attention_check_results,
    updated_at
  )
  values (
    v_response.id,
    v_response.survey_id,
    v_response.participant_user_id,
    v_response.status,
    v_response.submitted_at,
    private.analysis_filter_value(v_response, 'gender'),
    private.analysis_filter_value(v_response, 'semester_group'),
    private.analysis_filter_value(v_response, 'department'),
    private.analysis_filter_value(v_response, 'rc'),
    private.analysis_filter_value(v_response, 'dormitory'),
    private.analysis_filter_value(v_response, 'room_type'),
    private.analysis_filter_value(v_response, 'dorm_experience'),
    coalesce(v_response.profile_json, '{}'::jsonb),
    v_passed,
    v_results,
    now()
  )
  on conflict (response_id) do update
  set
    survey_id = excluded.survey_id,
    participant_user_id = excluded.participant_user_id,
    status = excluded.status,
    submitted_at = excluded.submitted_at,
    gender = excluded.gender,
    semester_group = excluded.semester_group,
    department = excluded.department,
    rc = excluded.rc,
    dormitory = excluded.dormitory,
    room_type = excluded.room_type,
    dorm_experience = excluded.dorm_experience,
    profile_json = excluded.profile_json,
    passed_attention_check = excluded.passed_attention_check,
    attention_check_results = excluded.attention_check_results,
    updated_at = excluded.updated_at;

  delete from public.analysis_answer_facts where response_id = p_response_id;

  insert into public.analysis_answer_facts (
    answer_id,
    survey_id,
    response_id,
    section_id,
    question_id,
    asset_id,
    answer_type,
    metric_type,
    topic_key,
    space_key,
    score_value,
    text_value,
    choice_value,
    x_ratio,
    y_ratio,
    tag_type,
    severity,
    value_json,
    created_at,
    response_submitted_at,
    gender,
    semester_group,
    department,
    rc,
    dormitory,
    room_type,
    dorm_experience,
    passed_attention_check,
    question_type,
    question_title,
    section_title,
    updated_at
  )
  select
    a.id,
    a.survey_id,
    a.response_id,
    a.section_id,
    a.question_id,
    a.asset_id,
    a.answer_type,
    coalesce(a.metric_type, 'none'),
    a.topic_key,
    a.space_key,
    a.score_value,
    a.text_value,
    a.choice_value,
    a.x_ratio,
    a.y_ratio,
    a.tag_type,
    a.severity,
    coalesce(a.value_json, '{}'::jsonb),
    a.created_at,
    v_response.submitted_at,
    private.analysis_filter_value(v_response, 'gender'),
    private.analysis_filter_value(v_response, 'semester_group'),
    private.analysis_filter_value(v_response, 'department'),
    private.analysis_filter_value(v_response, 'rc'),
    private.analysis_filter_value(v_response, 'dormitory'),
    private.analysis_filter_value(v_response, 'room_type'),
    private.analysis_filter_value(v_response, 'dorm_experience'),
    v_passed,
    q.question_type,
    q.title_ko,
    s.title_ko,
    now()
  from public.answers a
  left join public.questions q on q.id = a.question_id and q.survey_id = a.survey_id
  left join public.survey_sections s on s.id = a.section_id and s.survey_id = a.survey_id
  where a.response_id = p_response_id;
end;
$$;

create or replace function public.refresh_survey_analysis_facts(p_survey_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'private', 'public'
as $$
declare
  v_response_id uuid;
  v_count integer := 0;
begin
  if not private.can_edit_survey(p_survey_id) then
    raise exception 'You do not have permission to refresh analysis facts.'
      using errcode = '42501';
  end if;

  delete from public.analysis_answer_facts where survey_id = p_survey_id;
  delete from public.analysis_response_facts where survey_id = p_survey_id;

  for v_response_id in
    select id
    from public.responses
    where survey_id = p_survey_id
      and status = 'submitted'
  loop
    perform private.upsert_analysis_facts_for_response(v_response_id);
    v_count := v_count + 1;
  end loop;

  return jsonb_build_object('surveyId', p_survey_id::text, 'responsesRefreshed', v_count);
end;
$$;

grant execute on function public.refresh_survey_analysis_facts(uuid) to authenticated;

create or replace function public.submit_survey_response(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'private', 'public'
as $$
declare
  v_response_payload jsonb := coalesce(payload -> 'response', '{}'::jsonb);
  v_answers_payload jsonb := coalesce(payload -> 'answers', '[]'::jsonb);
  v_auth_user_id uuid := auth.uid();
  v_auth_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_survey_id uuid := nullif(v_response_payload ->> 'survey_id', '')::uuid;
  v_client_submission_id text := nullif(payload ->> 'clientSubmissionId', '');
  v_existing public.responses%rowtype;
  v_response_id uuid;
  v_submitted_at timestamptz;
  v_answer_count integer;
  v_inserted_answer_count integer;
  v_required_missing integer;
  v_invalid_asset_count integer;
  v_results jsonb;
  v_passed boolean;
begin
  if v_auth_user_id is null or v_auth_email = '' then
    raise exception 'Authentication is required to submit a survey response.'
      using errcode = '28000';
  end if;

  if v_survey_id is null then
    raise exception 'Survey id is required.'
      using errcode = '22023';
  end if;

  if jsonb_typeof(v_answers_payload) is distinct from 'array' then
    raise exception 'Answers must be an array.'
      using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.surveys s
    where s.id = v_survey_id
      and s.status = 'published'
      and s.is_latest_version = true
  ) then
    raise exception 'Survey is not open for responses.'
      using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(hashtext(v_survey_id::text), hashtext(v_auth_user_id::text));

  select *
  into v_existing
  from public.responses r
  where r.survey_id = v_survey_id
    and r.participant_user_id = v_auth_user_id
    and r.status = 'submitted'
  order by r.submitted_at desc nulls last, r.created_at desc
  limit 1;

  if found then
    if v_client_submission_id is not null and v_existing.client_submission_id = v_client_submission_id then
      return jsonb_build_object(
        'responseId', v_existing.id::text,
        'submittedAt', v_existing.submitted_at,
        'alreadySubmitted', true
      );
    end if;

    raise exception 'A submitted response already exists for this survey.'
      using errcode = '23505';
  end if;

  select count(*)::integer
  into v_answer_count
  from jsonb_array_elements(v_answers_payload) answer;

  with answer_rows as (
    select
      answer,
      nullif(answer ->> 'question_id', '')::uuid as question_id,
      nullif(answer ->> 'asset_id', '')::uuid as asset_id
    from jsonb_array_elements(v_answers_payload) answer
  )
  select count(*)::integer
  into v_required_missing
  from public.questions q
  where q.survey_id = v_survey_id
    and q.is_required = true
    and q.question_type not in ('display', 'intro')
    and not exists (
      select 1
      from answer_rows ar
      where ar.question_id = q.id
    );

  if coalesce(v_required_missing, 0) > 0 then
    raise exception 'Required answers are missing.'
      using errcode = '23502';
  end if;

  with answer_rows as (
    select nullif(answer ->> 'asset_id', '')::uuid as asset_id
    from jsonb_array_elements(v_answers_payload) answer
    where nullif(answer ->> 'asset_id', '') is not null
  )
  select count(*)::integer
  into v_invalid_asset_count
  from answer_rows ar
  where not exists (
    select 1
    from public.survey_assets sa
    where sa.id = ar.asset_id
      and sa.survey_id = v_survey_id
  );

  if coalesce(v_invalid_asset_count, 0) > 0 then
    raise exception 'One or more assets do not belong to this survey.'
      using errcode = '23503';
  end if;

  insert into public.responses (
    survey_id,
    participant_user_id,
    participant_email,
    status,
    locale,
    gender,
    semester_group,
    department,
    rc,
    dormitory,
    room_type,
    dorm_experience,
    profile_json,
    raw_payload,
    client_submission_id,
    started_at,
    submitted_at
  )
  values (
    v_survey_id,
    v_auth_user_id,
    v_auth_email,
    'submitted',
    coalesce(nullif(v_response_payload ->> 'locale', ''), 'ko'),
    nullif(v_response_payload ->> 'gender', ''),
    nullif(v_response_payload ->> 'semester_group', ''),
    nullif(v_response_payload ->> 'department', ''),
    nullif(v_response_payload ->> 'rc', ''),
    nullif(v_response_payload ->> 'dormitory', ''),
    nullif(v_response_payload ->> 'room_type', ''),
    nullif(v_response_payload ->> 'dorm_experience', ''),
    coalesce(v_response_payload -> 'profile_json', '{}'::jsonb),
    coalesce(v_response_payload -> 'raw_payload', payload -> 'rawPayload', '{}'::jsonb),
    v_client_submission_id,
    nullif(v_response_payload ->> 'started_at', '')::timestamptz,
    now()
  )
  returning id, submitted_at into v_response_id, v_submitted_at;

  with answer_rows as (
    select
      answer,
      nullif(answer ->> 'question_id', '')::uuid as question_id,
      nullif(answer ->> 'asset_id', '')::uuid as asset_id
    from jsonb_array_elements(v_answers_payload) answer
  ),
  inserted as (
    insert into public.answers (
      survey_id,
      response_id,
      section_id,
      question_id,
      asset_id,
      answer_type,
      metric_type,
      topic_key,
      space_key,
      score_value,
      text_value,
      choice_value,
      x_ratio,
      y_ratio,
      tag_type,
      severity,
      value_json
    )
    select
      v_survey_id,
      v_response_id,
      q.section_id,
      q.id,
      ar.asset_id,
      coalesce(nullif(ar.answer ->> 'answer_type', ''), q.question_type),
      coalesce(nullif(ar.answer ->> 'metric_type', ''), q.metric_type, 'none'),
      coalesce(nullif(ar.answer ->> 'topic_key', ''), q.topic_key),
      coalesce(nullif(ar.answer ->> 'space_key', ''), q.space_key),
      nullif(ar.answer ->> 'score_value', '')::numeric,
      nullif(ar.answer ->> 'text_value', ''),
      nullif(ar.answer ->> 'choice_value', ''),
      nullif(ar.answer ->> 'x_ratio', '')::numeric,
      nullif(ar.answer ->> 'y_ratio', '')::numeric,
      nullif(ar.answer ->> 'tag_type', ''),
      nullif(ar.answer ->> 'severity', '')::smallint,
      coalesce(ar.answer -> 'value_json', '{}'::jsonb)
    from answer_rows ar
    join public.questions q on q.id = ar.question_id and q.survey_id = v_survey_id
    returning 1
  )
  select count(*)::integer
  into v_inserted_answer_count
  from inserted;

  if v_inserted_answer_count <> v_answer_count then
    raise exception 'One or more answers do not belong to this survey.'
      using errcode = '23503';
  end if;

  v_results := private.analysis_compute_attention_results(v_response_id);
  v_passed := private.analysis_passed_from_results(v_results);

  update public.responses
  set
    passed_attention_check = v_passed,
    attention_check_results = v_results
  where id = v_response_id;

  perform private.upsert_analysis_facts_for_response(v_response_id);

  return jsonb_build_object(
    'responseId', v_response_id::text,
    'submittedAt', v_submitted_at,
    'alreadySubmitted', false,
    'passedAttentionCheck', v_passed
  );
end;
$$;

grant execute on function public.submit_survey_response(jsonb) to authenticated;

update public.responses r
set
  attention_check_results = private.analysis_compute_attention_results(r.id),
  passed_attention_check = private.analysis_passed_from_results(private.analysis_compute_attention_results(r.id))
where r.status = 'submitted'
  and r.passed_attention_check is null;

do $$
declare
  v_response_id uuid;
begin
  for v_response_id in
    select id from public.responses where status = 'submitted'
  loop
    perform private.upsert_analysis_facts_for_response(v_response_id);
  end loop;
end;
$$;

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
  valid_responses as (
    select *
    from public.analysis_response_facts f
    where f.survey_id = p_survey_id
      and f.status = 'submitted'
      and f.passed_attention_check = true
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
      (select count(*) from valid_responses)::bigint as total_responses,
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
    round(avg(a.score_value), 2) as avg_score,
    count(*)::bigint as n
  from public.analysis_answer_facts a
  left join public.survey_sections s on s.id = a.section_id and s.survey_id = a.survey_id
  where a.survey_id = p_survey_id
    and a.passed_attention_check = true
    and a.answer_type = 'scale'
    and a.metric_type = 'satisfaction'
    and a.score_value is not null
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
    round(avg(a.score_value), 2) as avg_score,
    coalesce(round(stddev_samp(a.score_value), 2), 0) as stddev_score,
    count(*)::bigint as n
  from public.analysis_answer_facts a
  left join public.questions q on q.id = a.question_id and q.survey_id = a.survey_id
  left join public.survey_sections s on s.id = a.section_id and s.survey_id = a.survey_id
  where a.survey_id = p_survey_id
    and a.passed_attention_check = true
    and a.answer_type = 'scale'
    and a.metric_type <> 'importance'
    and a.score_value is not null
    and private.analysis_fact_matches_filters(
      a.gender, a.semester_group, a.department, a.rc, a.dormitory, a.room_type, a.dorm_experience,
      a.section_id, a.question_id, a.asset_id, a.topic_key, a.space_key, a.tag_type, a.metric_type, a.text_value, p_filters
    )
  group by a.question_id, a.section_id, a.topic_key, a.metric_type
  order by max(s.order_index) nulls last, max(q.order_index) nulls last, question_title;
$$;

create or replace function public.get_choice_distribution(p_survey_id uuid, p_filters jsonb default '{}'::jsonb)
returns table (
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
  with answer_values as (
    select
      a.question_id,
      a.section_id,
      max(coalesce(a.question_title, q.title_ko)) as question_title,
      max(coalesce(a.section_title, s.title_ko)) as section_title,
      coalesce(a.choice_value, a.value_json->>'choiceValue', a.value_json->>'value') as option_value,
      count(*)::bigint as count
    from public.analysis_answer_facts a
    left join public.questions q on q.id = a.question_id and q.survey_id = a.survey_id
    left join public.survey_sections s on s.id = a.section_id and s.survey_id = a.survey_id
    where a.survey_id = p_survey_id
      and a.passed_attention_check = true
      and a.answer_type in ('single_choice', 'multi_select', 'ranking', 'profile', 'experience')
      and private.analysis_fact_matches_filters(
        a.gender, a.semester_group, a.department, a.rc, a.dormitory, a.room_type, a.dorm_experience,
        a.section_id, a.question_id, a.asset_id, a.topic_key, a.space_key, a.tag_type, a.metric_type, a.text_value, p_filters
      )
    group by a.question_id, a.section_id, coalesce(a.choice_value, a.value_json->>'choiceValue', a.value_json->>'value')
  ),
  totals as (
    select question_id, sum(count)::bigint as n
    from answer_values
    group by question_id
  ),
  option_labels as (
    select
      q.id as question_id,
      option_item.option->>'value' as option_value,
      coalesce(option_item.option->>'labelKo', option_item.option->>'label', option_item.option->>'labelEn', option_item.option->>'value') as option_label,
      option_item.ordinality
    from public.questions q
    cross join lateral jsonb_array_elements(coalesce(q.config->'options', '[]'::jsonb)) with ordinality as option_item(option, ordinality)
    where q.survey_id = p_survey_id
  )
  select
    av.question_id,
    av.question_title,
    av.section_id,
    av.section_title,
    coalesce(av.option_value, '기타/미분류') as option_value,
    coalesce(ol.option_label, av.option_value, '기타/미분류') as option_label,
    av.count,
    t.n,
    case when t.n > 0 then round((av.count::numeric / t.n) * 100, 1) else 0 end as percentage
  from answer_values av
  join totals t on t.question_id = av.question_id
  left join option_labels ol on ol.question_id = av.question_id and ol.option_value = av.option_value
  order by av.question_title, ol.ordinality nulls last, option_label;
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
      round(avg(a.score_value), 2) as avg_score,
      count(*)::bigint as n
    from public.analysis_answer_facts a
    where a.survey_id = p_survey_id
      and a.passed_attention_check = true
      and a.answer_type = 'scale'
      and a.metric_type = coalesce(nullif(p_filters->>'metric_type', ''), 'satisfaction')
      and a.score_value is not null
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
      round(avg(a.score_value), 2) as avg_satisfaction,
      count(*)::bigint as n
    from public.analysis_answer_facts a
    where a.survey_id = p_survey_id
      and a.passed_attention_check = true
      and a.answer_type = 'scale'
      and a.metric_type = 'satisfaction'
      and a.score_value is not null
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
  )
  select
    s.key as id,
    s.label,
    case when coalesce(tc.text_count, 0) + coalesce(ic.tag_count, 0) > 0 then 'mixed' else 'low_satisfaction' end as source,
    s.topic_key,
    s.section_title,
    null::numeric as avg_importance,
    s.avg_satisfaction,
    null::numeric as avg_gap,
    null::numeric as borich_score,
    coalesce(tc.text_count, 0) as text_count,
    coalesce(ic.tag_count, 0) as tag_count,
    s.n
  from satisfaction s
  left join text_counts tc on tc.key = s.key
  left join tag_counts ic on ic.key = s.key
  order by s.avg_satisfaction asc nulls last, (coalesce(tc.text_count, 0) + coalesce(ic.tag_count, 0)) desc, s.n desc
  limit 5;
$$;

drop function if exists public.get_heatmap_points(uuid, jsonb);

create or replace function public.get_heatmap_points(p_survey_id uuid, p_filters jsonb default '{}'::jsonb)
returns table (
  answer_id uuid,
  asset_id uuid,
  x_ratio numeric,
  y_ratio numeric,
  tag_type text,
  severity smallint,
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
    a.answer_id,
    a.asset_id,
    a.x_ratio,
    a.y_ratio,
    a.tag_type,
    a.severity,
    a.text_value,
    a.dormitory,
    a.room_type,
    a.rc,
    private.analysis_response_profile_json(a.gender, a.semester_group, a.department, a.rc, a.dormitory, a.room_type, a.dorm_experience) as response_profile
  from public.analysis_answer_facts a
  where a.survey_id = p_survey_id
    and a.passed_attention_check = true
    and a.answer_type in ('image_tag', 'participant_image_tag')
    and a.x_ratio between 0 and 1
    and a.y_ratio between 0 and 1
    and private.analysis_fact_matches_filters(
      a.gender, a.semester_group, a.department, a.rc, a.dormitory, a.room_type, a.dorm_experience,
      a.section_id, a.question_id, a.asset_id, a.topic_key, a.space_key, a.tag_type, a.metric_type, a.text_value, p_filters
    )
  order by a.created_at desc
  limit 500;
$$;

drop function if exists public.get_text_answers(uuid, jsonb);

create or replace function public.get_text_answers(p_survey_id uuid, p_filters jsonb default '{}'::jsonb)
returns table (
  answer_id uuid,
  response_id uuid,
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
  created_at timestamptz,
  next_cursor text
)
language sql
stable
set search_path to 'private', 'public'
as $$
  with params as (
    select
      least(greatest(coalesce(nullif(p_filters->>'limit', '')::integer, 50), 1), 100) as page_size,
      private.analysis_cursor_created_at(nullif(p_filters->>'cursor', '')) as cursor_created_at,
      private.analysis_cursor_answer_id(nullif(p_filters->>'cursor', '')) as cursor_answer_id
  ),
  rows as (
    select
      a.*,
      row_number() over (order by a.created_at desc, a.answer_id desc) as rn
    from public.analysis_answer_facts a
    cross join params p
    where a.survey_id = p_survey_id
      and a.passed_attention_check = true
      and a.answer_type = 'text'
      and nullif(a.text_value, '') is not null
      and (p.cursor_created_at is null or (a.created_at, a.answer_id) < (p.cursor_created_at, p.cursor_answer_id))
      and private.analysis_fact_matches_filters(
        a.gender, a.semester_group, a.department, a.rc, a.dormitory, a.room_type, a.dorm_experience,
        a.section_id, a.question_id, a.asset_id, a.topic_key, a.space_key, a.tag_type, a.metric_type, a.text_value, p_filters
      )
    order by a.created_at desc, a.answer_id desc
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
    a.question_id,
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
    case when (select count(*) from rows) > (select page_size from params) then (select cursor_value from cursor_row) end as next_cursor
  from page_rows a
  order by a.created_at desc, a.answer_id desc;
$$;

create or replace function public.get_text_groups(p_survey_id uuid, p_filters jsonb default '{}'::jsonb)
returns table (
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
      coalesce(a.topic_key, a.space_key, a.question_id::text, '기타/미분류') as group_key,
      a.topic_key,
      a.value_json->>'issue_type' as issue_type,
      a.question_id,
      a.text_value,
      a.created_at,
      row_number() over (partition by coalesce(a.topic_key, a.space_key, a.question_id::text, '기타/미분류') order by a.created_at desc) as representative_rank
    from public.analysis_answer_facts a
    where a.survey_id = p_survey_id
      and a.passed_attention_check = true
      and a.answer_type = 'text'
      and nullif(a.text_value, '') is not null
      and private.analysis_fact_matches_filters(
        a.gender, a.semester_group, a.department, a.rc, a.dormitory, a.room_type, a.dorm_experience,
        a.section_id, a.question_id, a.asset_id, a.topic_key, a.space_key, a.tag_type, a.metric_type, a.text_value, p_filters
      )
  )
  select
    group_key,
    group_key as label,
    max(topic_key) as topic_key,
    max(issue_type) as issue_type,
    (array_agg(question_id order by created_at desc))[1] as question_id,
    count(*)::bigint as count,
    count(*)::bigint as n,
    array_agg(text_value order by created_at desc) filter (where representative_rank <= 3) as representative_texts
  from answers
  group by group_key
  order by count(*) desc, group_key;
$$;

drop function if exists public.get_image_tag_answers(uuid, jsonb);

create or replace function public.get_image_tag_answers(p_survey_id uuid, p_filters jsonb default '{}'::jsonb)
returns table (
  answer_id uuid,
  response_id uuid,
  section_id uuid,
  section_title text,
  question_id uuid,
  question_title text,
  question_type text,
  asset_id uuid,
  answer_type text,
  x_ratio numeric,
  y_ratio numeric,
  tag_type text,
  severity smallint,
  text_value text,
  value_json jsonb,
  image_storage_bucket text,
  image_storage_path text,
  image_signed_url text,
  dormitory text,
  room_type text,
  rc text,
  department text,
  response_profile jsonb,
  created_at timestamptz,
  next_cursor text
)
language sql
stable
set search_path to 'private', 'public'
as $$
  with params as (
    select
      least(greatest(coalesce(nullif(p_filters->>'limit', '')::integer, 50), 1), 100) as page_size,
      private.analysis_cursor_created_at(nullif(p_filters->>'cursor', '')) as cursor_created_at,
      private.analysis_cursor_answer_id(nullif(p_filters->>'cursor', '')) as cursor_answer_id
  ),
  rows as (
    select
      a.*,
      sa.storage_bucket,
      sa.storage_path,
      row_number() over (order by a.created_at desc, a.answer_id desc) as rn
    from public.analysis_answer_facts a
    left join public.survey_assets sa on sa.id = a.asset_id and sa.survey_id = a.survey_id
    cross join params p
    where a.survey_id = p_survey_id
      and a.passed_attention_check = true
      and a.answer_type in ('image_tag', 'participant_image_tag')
      and a.x_ratio between 0 and 1
      and a.y_ratio between 0 and 1
      and (p.cursor_created_at is null or (a.created_at, a.answer_id) < (p.cursor_created_at, p.cursor_answer_id))
      and private.analysis_fact_matches_filters(
        a.gender, a.semester_group, a.department, a.rc, a.dormitory, a.room_type, a.dorm_experience,
        a.section_id, a.question_id, a.asset_id, a.topic_key, a.space_key, a.tag_type, a.metric_type, a.text_value, p_filters
      )
    order by a.created_at desc, a.answer_id desc
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
    a.asset_id,
    a.answer_type,
    a.x_ratio,
    a.y_ratio,
    a.tag_type,
    a.severity,
    a.text_value,
    a.value_json,
    coalesce(a.value_json #>> '{image,storageBucket}', a.value_json #>> '{image,storage_bucket}', a.storage_bucket) as image_storage_bucket,
    coalesce(a.value_json #>> '{image,storagePath}', a.value_json #>> '{image,storage_path}', a.storage_path) as image_storage_path,
    null::text as image_signed_url,
    a.dormitory,
    a.room_type,
    a.rc,
    a.department,
    private.analysis_response_profile_json(a.gender, a.semester_group, a.department, a.rc, a.dormitory, a.room_type, a.dorm_experience) as response_profile,
    a.created_at,
    case when (select count(*) from rows) > (select page_size from params) then (select cursor_value from cursor_row) end as next_cursor
  from page_rows a
  order by a.created_at desc, a.answer_id desc;
$$;

grant execute on function public.get_heatmap_points(uuid, jsonb) to authenticated;
grant execute on function public.get_text_answers(uuid, jsonb) to authenticated;
grant execute on function public.get_image_tag_answers(uuid, jsonb) to authenticated;

analyze public.responses;
analyze public.answers;
analyze public.analysis_response_facts;
analyze public.analysis_answer_facts;
