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
    union all select '5' from expected where value in ('매우중요하다', '매우중요함', '매우만족')
    union all select '4' from expected where value in ('중요하다', '중요함', '만족')
    union all select '3' from expected where value = '보통'
    union all select '2' from expected where value in ('중요하지않다', '중요하지않음', '불만족')
    union all select '1' from expected where value in ('전혀중요하지않다', '전혀중요하지않음', '매우불만족')
  )
  select exists (
    select 1
    from normalized_values v
    join normalized_expected e on e.value = v.value
  );
$$;
