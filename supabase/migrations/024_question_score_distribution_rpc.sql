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
    coalesce(a.metric_type, q.metric_type, 'satisfaction') as metric_type,
    round(avg(a.score_value)::numeric, 2) as avg_score,
    coalesce(round(stddev_samp(a.score_value)::numeric, 2), 0) as stddev_score,
    count(*)::bigint as n
  from public.answers a
  join public.responses r on r.id = a.response_id and r.survey_id = a.survey_id
  left join public.questions q on q.id = a.question_id
  left join public.survey_sections s on s.id = a.section_id
  where a.survey_id = p_survey_id
    and r.status = 'submitted'
    and a.answer_type = 'scale'
    and coalesce(a.metric_type, q.metric_type, 'satisfaction') = 'satisfaction'
    and a.score_value is not null
    and private.matches_analysis_profile_filters(r, p_filters)
    and private.matches_analysis_answer_filters(a, p_filters)
  group by a.question_id, q.title_ko, a.section_id, s.title_ko, a.topic_key, coalesce(a.metric_type, q.metric_type, 'satisfaction')
  order by avg_score asc nulls last, n desc, question_title;
$$;

create or replace function public.get_choice_distribution(p_survey_id uuid, p_filters jsonb default '{}'::jsonb)
returns table(
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
  with base as (
    select
      a.question_id,
      coalesce(q.title_ko, '제목 없는 질문') as question_title,
      a.section_id,
      coalesce(s.title_ko, '섹션 미지정') as section_title,
      q.config,
      a.answer_type,
      option_values.option_value
    from public.answers a
    join public.responses r on r.id = a.response_id and r.survey_id = a.survey_id
    left join public.questions q on q.id = a.question_id
    left join public.survey_sections s on s.id = a.section_id
    cross join lateral (
      select trim(to_char(a.score_value, 'FM999990.##')) as option_value
      where a.answer_type = 'scale' and a.score_value is not null
      union all
      select nullif(a.choice_value, '')
      where nullif(a.choice_value, '') is not null
      union all
      select nullif(a.value_json->>'choiceValue', '')
      where nullif(a.value_json->>'choiceValue', '') is not null
      union all
      select nullif(a.value_json->>'choice_value', '')
      where nullif(a.value_json->>'choice_value', '') is not null
      union all
      select nullif(a.value_json->>'selectedValue', '')
      where nullif(a.value_json->>'selectedValue', '') is not null
      union all
      select nullif(a.value_json->>'selected_value', '')
      where nullif(a.value_json->>'selected_value', '') is not null
      union all
      select jsonb_array_elements_text(a.value_json->'values')
      where jsonb_typeof(a.value_json->'values') = 'array'
      union all
      select jsonb_array_elements_text(a.value_json->'choiceValues')
      where jsonb_typeof(a.value_json->'choiceValues') = 'array'
      union all
      select jsonb_array_elements_text(a.value_json->'choice_values')
      where jsonb_typeof(a.value_json->'choice_values') = 'array'
      union all
      select nullif(a.text_value, '')
      where (a.answer_type = 'profile' or q.question_type = 'profile') and nullif(a.text_value, '') is not null
    ) as option_values
    where a.survey_id = p_survey_id
      and r.status = 'submitted'
      and a.answer_type in ('scale', 'single_choice', 'multi_select', 'experience', 'profile')
      and (a.answer_type <> 'scale' or coalesce(a.metric_type, q.metric_type, 'satisfaction') = 'satisfaction')
      and private.matches_analysis_profile_filters(r, p_filters)
      and private.matches_analysis_answer_filters(a, p_filters)
  ),
  labeled as (
    select
      base.question_id,
      base.question_title,
      base.section_id,
      base.section_title,
      base.answer_type,
      base.option_value,
      coalesce(
        nullif(option_item.option->>'labelKo', ''),
        nullif(option_item.option->>'label', ''),
        nullif(option_item.option->>'labelEn', ''),
        case when base.answer_type = 'scale' then base.option_value || '점' else base.option_value end
      ) as option_label,
      case
        when base.answer_type = 'scale' and base.option_value ~ '^[0-9]+(\\.[0-9]+)?$' then base.option_value::numeric
        else null
      end as numeric_order
    from base
    left join lateral (
      select option
      from jsonb_array_elements(
        case
          when jsonb_typeof(base.config->'options') = 'array' then base.config->'options'
          else '[]'::jsonb
        end
      ) as option_item(option)
      where nullif(option_item.option->>'value', '') = base.option_value
      limit 1
    ) as option_item on true
    where base.option_value is not null
  ),
  grouped as (
    select
      question_id,
      question_title,
      section_id,
      section_title,
      option_value,
      option_label,
      min(numeric_order) as numeric_order,
      count(*)::bigint as count
    from labeled
    group by question_id, question_title, section_id, section_title, option_value, option_label
  ),
  totals as (
    select question_id, sum(count)::bigint as n
    from grouped
    group by question_id
  )
  select
    grouped.question_id,
    grouped.question_title,
    grouped.section_id,
    grouped.section_title,
    grouped.option_value,
    grouped.option_label,
    grouped.count,
    totals.n,
    case when totals.n > 0 then round((grouped.count::numeric / totals.n::numeric) * 100, 1) else 0 end as percentage
  from grouped
  join totals on totals.question_id = grouped.question_id
  order by grouped.section_title, grouped.question_title, grouped.numeric_order nulls last, grouped.count desc, grouped.option_label;
$$;
