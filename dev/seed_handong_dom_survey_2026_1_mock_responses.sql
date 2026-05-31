do $$
declare
  v_seed_key text := 'taglow_mock_handong_dom_survey_2026_1_10';
  v_survey_id uuid;
begin
  select s.id
  into v_survey_id
  from public.surveys s
  where s.public_slug = 'handong-dom-survey-2026-1'
     or s.public_code = upper('handong-dom-survey-2026-1')
  order by s.is_latest_version desc, s.created_at desc
  limit 1;

  if v_survey_id is null then
    raise exception 'Survey not found for public identifier %', 'handong-dom-survey-2026-1';
  end if;

  delete from public.responses
  where survey_id = v_survey_id
    and raw_payload->>'seedKey' = v_seed_key;

  delete from auth.users
  where raw_user_meta_data->>'seedKey' = v_seed_key;

  with mock_profiles(idx, gender, semester_group, department, rc, dormitory, room_type, dorm_experience) as (
    values
      (1, 'female', 'option_1', 'option_1', 'option_1', 'option_1', '1', null),
      (2, 'male', 'option_2', 'option_2', 'option_2', 'option_2', '2', null),
      (3, 'female', 'option_3', 'option_5', 'option_3', 'option_3', '3', null),
      (4, 'male', 'option_4', 'option_6', 'option_4', 'option_4', '4', null),
      (5, 'female', 'option_5', 'option_7', 'option_5', 'option_5', '2', null),
      (6, 'male', 'option_6', 'option_8', 'option_6', 'option_6', '3', null),
      (7, 'female', 'option_7', 'option_9', 'option_1', 'option_1', '4', null),
      (8, 'male', 'option_8', 'option_10', 'option_2', 'option_2', '1', null),
      (9, 'female', 'option_9', 'option_11', 'option_3', 'option_3', '2', null),
      (10, 'male', 'option_3', 'option_12', 'option_4', 'option_4', '3', null)
  ),
  mock_users as (
    insert into auth.users (
      id,
      aud,
      role,
      email,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      is_sso_user,
      is_anonymous
    )
    select
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      format('taglow-mock-%s@example.invalid', lpad(mp.idx::text, 2, '0')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
      jsonb_build_object('seedKey', v_seed_key, 'mockIndex', mp.idx, 'name', format('Taglow Mock %s', mp.idx)),
      now(),
      now(),
      false,
      false
    from mock_profiles mp
    returning id, email, (raw_user_meta_data->>'mockIndex')::integer as idx
  ),
  inserted_responses as (
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
      started_at,
      submitted_at,
      created_at,
      updated_at
    )
    select
      v_survey_id,
      mu.id,
      mu.email,
      'submitted',
      'ko',
      mp.gender,
      mp.semester_group,
      mp.department,
      mp.rc,
      mp.dormitory,
      mp.room_type,
      mp.dorm_experience,
      jsonb_strip_nulls(jsonb_build_object(
        'gender', mp.gender,
        'semesterGroup', mp.semester_group,
        'semester_group', mp.semester_group,
        'department', mp.department,
        'rc', mp.rc,
        'dormitory', mp.dormitory,
        'roomType', mp.room_type,
        'room_type', mp.room_type,
        'dormExperience', mp.dorm_experience,
        'dorm_experience', mp.dorm_experience
      )),
      jsonb_strip_nulls(jsonb_build_object(
        'seedKey', v_seed_key,
        'mockIndex', mp.idx,
        'profile', jsonb_build_object(
          'gender', mp.gender,
          'semesterGroup', mp.semester_group,
          'department', mp.department,
          'rc', mp.rc,
          'dormitory', mp.dormitory,
          'roomType', mp.room_type
        )
      )),
      now() - make_interval(hours => 12, mins => mp.idx),
      now() - make_interval(hours => 11, mins => mp.idx),
      now() - make_interval(hours => 12, mins => mp.idx),
      now() - make_interval(hours => 11, mins => mp.idx)
    from mock_profiles mp
    join mock_users mu on mu.idx = mp.idx
    returning id, survey_id, (raw_payload->>'mockIndex')::integer as idx
  ),
  question_base as (
    select
      q.id,
      q.section_id,
      q.question_type,
      q.title_ko,
      q.metric_type,
      q.topic_key,
      q.space_key,
      q.order_index,
      coalesce(nullif(q.config->>'profileField', ''), '') as profile_field,
      case when jsonb_typeof(q.config->'options') = 'array' then q.config->'options' else '[]'::jsonb end as options
    from public.questions q
    where q.survey_id = v_survey_id
      and q.question_type <> 'participant_image_tag'
  ),
  question_rows as (
    select
      qb.*,
      greatest(jsonb_array_length(qb.options), 1) as option_count
    from question_base qb
  ),
  generated_answers as (
    select
      ir.survey_id,
      ir.id as response_id,
      q.section_id,
      q.id as question_id,
      q.question_type as answer_type,
      q.metric_type,
      q.topic_key,
      q.space_key,
      case
        when q.question_type = 'scale' and q.title_ko like '%''3''을 선택%' then 3
        when q.question_type = 'scale' then ((ir.idx + q.order_index) % 5) + 1
        when q.question_type = 'attention_check' then 3
        else null
      end::numeric as score_value,
      case
        when q.question_type = 'text'
          then format('모의 응답 %s: %s 영역은 개선 의견을 확인하기 위한 테스트 문장입니다.', ir.idx, coalesce(q.topic_key, q.space_key, 'general'))
        else null
      end as text_value,
      case
        when q.question_type = 'profile' then
          case q.profile_field
            when 'gender' then mp.gender
            when 'semester' then mp.semester_group
            when 'semester_group' then mp.semester_group
            when 'semesterGroup' then mp.semester_group
            when 'department' then mp.department
            when 'rc' then mp.rc
            when 'dormitory' then mp.dormitory
            when 'room_type' then mp.room_type
            when 'roomType' then mp.room_type
            when 'dorm_experience' then mp.dorm_experience
            when 'dormExperience' then mp.dorm_experience
            else coalesce(selected.option_value, 'option_1')
          end
        when q.question_type in ('single_choice', 'experience') then coalesce(selected.option_value, 'option_1')
        else null
      end as choice_value,
      case
        when q.question_type = 'profile' then jsonb_strip_nulls(jsonb_build_object(
          'profileField', q.profile_field,
          'choiceValue',
            case q.profile_field
              when 'gender' then mp.gender
              when 'semester' then mp.semester_group
              when 'semester_group' then mp.semester_group
              when 'semesterGroup' then mp.semester_group
              when 'department' then mp.department
              when 'rc' then mp.rc
              when 'dormitory' then mp.dormitory
              when 'room_type' then mp.room_type
              when 'roomType' then mp.room_type
              when 'dorm_experience' then mp.dorm_experience
              when 'dormExperience' then mp.dorm_experience
              else coalesce(selected.option_value, 'option_1')
            end
        ))
        when q.question_type = 'scale' and q.title_ko like '%''3''을 선택%' then jsonb_build_object('scoreValue', 3)
        when q.question_type = 'scale' then jsonb_build_object('scoreValue', ((ir.idx + q.order_index) % 5) + 1)
        when q.question_type in ('single_choice', 'experience') then jsonb_build_object('choiceValue', coalesce(selected.option_value, 'option_1'))
        when q.question_type = 'multi_select' then jsonb_build_object('values', jsonb_build_array(coalesce(selected.option_value, 'option_1'), coalesce(next_selected.option_value, selected.option_value, 'option_1')))
        when q.question_type = 'text' then jsonb_build_object('mock', true, 'seedKey', v_seed_key)
        when q.question_type = 'attention_check' then jsonb_build_object('expected', 3, 'scoreValue', 3)
        else '{}'::jsonb
      end as value_json
    from inserted_responses ir
    join mock_profiles mp on mp.idx = ir.idx
    cross join question_rows q
    left join lateral (
      select option_item.option->>'value' as option_value
      from jsonb_array_elements(q.options) with ordinality as option_item(option, ordinality)
      where option_item.ordinality = (((ir.idx + q.order_index)::integer % q.option_count) + 1)
      limit 1
    ) selected on true
    left join lateral (
      select option_item.option->>'value' as option_value
      from jsonb_array_elements(q.options) with ordinality as option_item(option, ordinality)
      where option_item.ordinality = (((ir.idx + q.order_index + 1)::integer % q.option_count) + 1)
      limit 1
    ) next_selected on true
  )
  insert into public.answers (
    survey_id,
    response_id,
    section_id,
    question_id,
    answer_type,
    metric_type,
    topic_key,
    space_key,
    score_value,
    text_value,
    choice_value,
    value_json
  )
  select
    survey_id,
    response_id,
    section_id,
    question_id,
    answer_type,
    metric_type,
    topic_key,
    space_key,
    score_value,
    text_value,
    choice_value,
    value_json
  from generated_answers;
end $$;
