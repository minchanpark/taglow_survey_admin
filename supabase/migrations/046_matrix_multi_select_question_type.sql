alter table public.questions
drop constraint if exists questions_question_type_check;

alter table public.questions
add constraint questions_question_type_check
check (
  question_type = any (
    array[
      'profile',
      'experience',
      'scale',
      'single_choice',
      'multi_select',
      'matrix_multi_select',
      'ranking',
      'text',
      'image_tag',
      'participant_image_tag',
      'attention_check'
    ]::text[]
  )
);

alter table public.answers
drop constraint if exists answers_answer_type_check;

alter table public.answers
add constraint answers_answer_type_check
check (
  answer_type = any (
    array[
      'profile',
      'experience',
      'scale',
      'single_choice',
      'multi_select',
      'matrix_multi_select',
      'ranking',
      'text',
      'image_tag',
      'participant_image_tag',
      'attention_check'
    ]::text[]
  )
);

update public.questions
set
  question_type = 'matrix_multi_select',
  updated_at = now()
where question_key = 'dorm_25_2_q154'
  and (
    config->>'importSource' = 'handong-dom-survey-2026-1'
    or config->>'sourceNumber' = '154'
    or title_ko like '주로 세탁기 및 건조기를 사용하는 요일과 시간대는 언제입니까?%'
  )
  and question_type is distinct from 'matrix_multi_select';

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
      and a.answer_type in ('single_choice', 'multi_select', 'matrix_multi_select', 'ranking', 'profile', 'experience')
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

create index if not exists idx_analysis_answer_facts_choice_answer_type_v2
on public.analysis_answer_facts (survey_id, answer_type, question_id, choice_value)
where answer_type in ('single_choice', 'multi_select', 'matrix_multi_select', 'ranking', 'profile', 'experience');

analyze public.questions;
analyze public.answers;
analyze public.analysis_answer_facts;
