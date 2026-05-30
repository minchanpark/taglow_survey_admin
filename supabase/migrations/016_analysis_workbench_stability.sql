alter table public.responses
add column if not exists profile_json jsonb;

alter table public.responses
add column if not exists raw_payload jsonb;

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
      nullif(p_response.raw_payload #>> '{profile,gender}', '')
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
      nullif(p_response.raw_payload #>> '{profile,semesterGroup}', '')
    )
    when 'department' then coalesce(
      nullif(p_response.department, ''),
      nullif(p_response.profile_json->>'department', ''),
      nullif(p_response.profile_json #>> '{profile,department}', ''),
      nullif(p_response.raw_payload->>'department', ''),
      nullif(p_response.raw_payload #>> '{profile,department}', '')
    )
    when 'rc' then coalesce(
      nullif(p_response.rc, ''),
      nullif(p_response.profile_json->>'rc', ''),
      nullif(p_response.profile_json #>> '{profile,rc}', ''),
      nullif(p_response.raw_payload->>'rc', ''),
      nullif(p_response.raw_payload #>> '{profile,rc}', '')
    )
    when 'dormitory' then coalesce(
      nullif(p_response.dormitory, ''),
      nullif(p_response.profile_json->>'dormitory', ''),
      nullif(p_response.profile_json #>> '{profile,dormitory}', ''),
      nullif(p_response.raw_payload->>'dormitory', ''),
      nullif(p_response.raw_payload #>> '{profile,dormitory}', '')
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
      nullif(p_response.raw_payload #>> '{profile,roomType}', '')
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
      nullif(p_response.raw_payload #>> '{profile,dormExperience}', '')
    )
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
    (nullif(p_filters->>'gender', '') is null or private.analysis_filter_value(p_response, 'gender') = p_filters->>'gender')
    and (nullif(p_filters->>'semester_group', '') is null or private.analysis_filter_value(p_response, 'semester_group') = p_filters->>'semester_group')
    and (nullif(p_filters->>'department', '') is null or private.analysis_filter_value(p_response, 'department') = p_filters->>'department')
    and (nullif(p_filters->>'rc', '') is null or private.analysis_filter_value(p_response, 'rc') = p_filters->>'rc')
    and (nullif(p_filters->>'dormitory', '') is null or private.analysis_filter_value(p_response, 'dormitory') = p_filters->>'dormitory')
    and (nullif(p_filters->>'room_type', '') is null or private.analysis_filter_value(p_response, 'room_type') = p_filters->>'room_type')
    and (nullif(p_filters->>'dorm_experience', '') is null or private.analysis_filter_value(p_response, 'dorm_experience') = p_filters->>'dorm_experience');
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
    private.analysis_filter_value(r, 'dormitory') as dormitory,
    private.analysis_filter_value(r, 'room_type') as room_type,
    private.analysis_filter_value(r, 'rc') as rc,
    jsonb_strip_nulls(jsonb_build_object(
      'gender', private.analysis_filter_value(r, 'gender'),
      'semesterGroup', private.analysis_filter_value(r, 'semester_group'),
      'department', private.analysis_filter_value(r, 'department'),
      'rc', private.analysis_filter_value(r, 'rc'),
      'dormitory', private.analysis_filter_value(r, 'dormitory'),
      'roomType', private.analysis_filter_value(r, 'room_type'),
      'dormExperience', private.analysis_filter_value(r, 'dorm_experience')
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
    private.analysis_filter_value(r, 'dormitory') as dormitory,
    private.analysis_filter_value(r, 'room_type') as room_type,
    private.analysis_filter_value(r, 'rc') as rc,
    private.analysis_filter_value(r, 'department') as department,
    jsonb_strip_nulls(jsonb_build_object(
      'gender', private.analysis_filter_value(r, 'gender'),
      'semesterGroup', private.analysis_filter_value(r, 'semester_group'),
      'department', private.analysis_filter_value(r, 'department'),
      'rc', private.analysis_filter_value(r, 'rc'),
      'dormitory', private.analysis_filter_value(r, 'dormitory'),
      'roomType', private.analysis_filter_value(r, 'room_type'),
      'dormExperience', private.analysis_filter_value(r, 'dorm_experience')
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

create index if not exists idx_analysis_responses_survey_status
on public.responses (survey_id, status);

create index if not exists idx_analysis_responses_profile_filters
on public.responses (survey_id, status, gender, semester_group, department, rc, dormitory, room_type, dorm_experience);

create index if not exists idx_analysis_questions_profile_options
on public.questions (survey_id, question_type, order_index)
where question_type = 'profile';

create index if not exists idx_analysis_answers_scale
on public.answers (survey_id, metric_type, section_id, question_id, topic_key)
where answer_type = 'scale' and score_value is not null;

create index if not exists idx_analysis_answers_choice
on public.answers (survey_id, answer_type, question_id)
where answer_type in ('single_choice', 'multi_select', 'experience', 'profile');

create index if not exists idx_analysis_answers_text
on public.answers (survey_id, topic_key, space_key, question_id, created_at desc)
where answer_type = 'text' and text_value is not null;

create index if not exists idx_analysis_answers_image_tag
on public.answers (survey_id, asset_id, tag_type, created_at desc)
where answer_type in ('image_tag', 'participant_image_tag');
