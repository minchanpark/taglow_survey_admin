create or replace function private.analysis_normalize_check_value(p_value text)
returns text
language sql
immutable
set search_path to 'private', 'public'
as $$
  select nullif(regexp_replace(lower(trim(coalesce(p_value, ''))), '[^0-9a-z가-힣]+', '', 'g'), '');
$$;

create or replace function private.analysis_attention_expected_value(p_question public.questions)
returns text
language sql
stable
set search_path to 'private', 'public'
as $$
  select coalesce(
    nullif(p_question.config->>'expectedValue', ''),
    nullif(p_question.config->>'expected_value', ''),
    nullif(p_question.config->>'expectedAnswer', ''),
    nullif(p_question.config->>'expected_answer', ''),
    nullif((regexp_match(coalesce(p_question.title_ko, ''), '[''\"“”‘’]([^''\"“”‘’]+)[''\"“”‘’][^0-9A-Za-z가-힣]{0,8}(을|를)?[^0-9A-Za-z가-힣]{0,8}선택'))[1], ''),
    nullif((regexp_match(coalesce(p_question.title_ko, ''), '([1-5])[^0-9]{0,16}선택'))[1], '')
  );
$$;

create or replace function private.is_analysis_attention_check_question(p_question public.questions)
returns boolean
language sql
stable
set search_path to 'private', 'public'
as $$
  select
    p_question.question_type = 'attention_check'
    or nullif(p_question.config->>'expectedValue', '') is not null
    or nullif(p_question.config->>'expected_value', '') is not null
    or nullif(p_question.config->>'expectedAnswer', '') is not null
    or nullif(p_question.config->>'expected_answer', '') is not null
    or regexp_match(coalesce(p_question.title_ko, ''), '[''\"“”‘’]([^''\"“”‘’]+)[''\"“”‘’][^0-9A-Za-z가-힣]{0,8}(을|를)?[^0-9A-Za-z가-힣]{0,8}선택') is not null
    or regexp_match(coalesce(p_question.title_ko, ''), '([1-5])[^0-9]{0,16}선택') is not null;
$$;

create or replace function private.analysis_answer_matches_expected(
  p_answer public.answers,
  p_question public.questions,
  p_expected text
)
returns boolean
language sql
stable
set search_path to 'private', 'public'
as $$
  with expected as (
    select private.analysis_normalize_check_value(p_expected) as value
  ),
  answer_values as (
    select private.analysis_normalize_check_value(trim(to_char(p_answer.score_value, 'FM999990.##'))) as value
    where p_answer.score_value is not null
    union all
    select private.analysis_normalize_check_value(p_answer.choice_value)
    union all
    select private.analysis_normalize_check_value(p_answer.text_value)
    union all
    select private.analysis_normalize_check_value(p_answer.value_json->>'choiceValue')
    union all
    select private.analysis_normalize_check_value(p_answer.value_json->>'choice_value')
    union all
    select private.analysis_normalize_check_value(p_answer.value_json->>'selectedValue')
    union all
    select private.analysis_normalize_check_value(p_answer.value_json->>'selected_value')
    union all
    select private.analysis_normalize_check_value(p_answer.value_json->>'value')
    union all
    select private.analysis_normalize_check_value(p_answer.value_json->>'labelKo')
    union all
    select private.analysis_normalize_check_value(p_answer.value_json->>'label')
    union all
    select private.analysis_normalize_check_value(p_answer.value_json->>'labelEn')
    union all
    select private.analysis_normalize_check_value(option_item.option->>'labelKo')
    from jsonb_array_elements(
      case when jsonb_typeof(p_question.config->'options') = 'array' then p_question.config->'options' else '[]'::jsonb end
    ) as option_item(option)
    where nullif(option_item.option->>'value', '') = p_answer.choice_value
    union all
    select private.analysis_normalize_check_value(option_item.option->>'label')
    from jsonb_array_elements(
      case when jsonb_typeof(p_question.config->'options') = 'array' then p_question.config->'options' else '[]'::jsonb end
    ) as option_item(option)
    where nullif(option_item.option->>'value', '') = p_answer.choice_value
    union all
    select private.analysis_normalize_check_value(option_item.option->>'labelEn')
    from jsonb_array_elements(
      case when jsonb_typeof(p_question.config->'options') = 'array' then p_question.config->'options' else '[]'::jsonb end
    ) as option_item(option)
    where nullif(option_item.option->>'value', '') = p_answer.choice_value
  ),
  normalized_values as (
    select value from answer_values where value is not null
    union all
    select '매우중요함' where exists (select 1 from answer_values where value = '매우중요하다')
    union all
    select '매우중요하다' where exists (select 1 from answer_values where value = '매우중요함')
  ),
  normalized_expected as (
    select value from expected where value is not null
    union all select '매우중요함' from expected where value = '매우중요하다'
    union all select '매우중요하다' from expected where value = '매우중요함'
  )
  select exists (
    select 1
    from normalized_values v
    join normalized_expected e on e.value = v.value
  );
$$;

create or replace function private.passes_analysis_attention_checks(p_response public.responses)
returns boolean
language sql
stable
set search_path to 'private', 'public'
as $$
  select not exists (
    select 1
    from public.questions q
    where q.survey_id = p_response.survey_id
      and private.is_analysis_attention_check_question(q)
      and not exists (
        select 1
        from public.answers a
        where a.survey_id = p_response.survey_id
          and a.response_id = p_response.id
          and a.question_id = q.id
          and private.analysis_answer_matches_expected(a, q, private.analysis_attention_expected_value(q))
      )
  );
$$;

create or replace function private.matches_analysis_profile_filters(p_response public.responses, p_filters jsonb default '{}'::jsonb)
returns boolean
language sql
stable
set search_path to 'private', 'public'
as $$
  select
    private.passes_analysis_attention_checks(p_response)
    and (nullif(p_filters->>'gender', '') is null or private.analysis_filter_value(p_response, 'gender') = p_filters->>'gender')
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
    not exists (
      select 1
      from public.questions q
      where q.id = p_answer.question_id
        and q.survey_id = p_answer.survey_id
        and private.is_analysis_attention_check_question(q)
    )
    and (nullif(p_filters->>'section_id', '') is null or p_answer.section_id::text = p_filters->>'section_id')
    and (nullif(p_filters->>'topic_key', '') is null or p_answer.topic_key = p_filters->>'topic_key')
    and (nullif(p_filters->>'space_key', '') is null or p_answer.space_key = p_filters->>'space_key')
    and (nullif(p_filters->>'asset_id', '') is null or p_answer.asset_id::text = p_filters->>'asset_id')
    and (nullif(p_filters->>'tag_type', '') is null or p_answer.tag_type = p_filters->>'tag_type');
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
  with valid_submitted_responses as (
    select r.*
    from public.responses r
    where r.survey_id = p_survey_id
      and r.status = 'submitted'
      and private.passes_analysis_attention_checks(r)
  ),
  counts as (
    select
      count(*)::bigint as total_responses,
      count(*)::bigint as submitted_responses,
      count(*) filter (where private.matches_analysis_profile_filters(valid_submitted_responses, p_filters))::bigint as filtered_responses
    from valid_submitted_responses
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

create index if not exists idx_analysis_answers_response_question
on public.answers (survey_id, response_id, question_id);
