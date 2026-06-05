with day_names(day_order, label_ko, label_en, value_prefix) as (
  values
    (1, '월', 'Mon', 'mon'),
    (2, '화', 'Tue', 'tue'),
    (3, '수', 'Wed', 'wed'),
    (4, '목', 'Thu', 'thu'),
    (5, '금', 'Fri', 'fri'),
    (6, '토', 'Sat', 'sat'),
    (7, '일', 'Sun', 'sun')
),
time_slots(slot_order, label, value_suffix) as (
  values
    (1, '05:00~07:00', '05_00_07_00'),
    (2, '07:00~09:00', '07_00_09_00'),
    (3, '09:00~11:00', '09_00_11_00'),
    (4, '11:00~13:00', '11_00_13_00'),
    (5, '13:00~15:00', '13_00_15_00'),
    (6, '15:00~17:00', '15_00_17_00'),
    (7, '17:00~19:00', '17_00_19_00'),
    (8, '19:00~21:00', '19_00_21_00'),
    (9, '21:00~23:00', '21_00_23_00')
),
day_time_options as (
  select
    jsonb_agg(
      jsonb_build_object(
        'value',
        day_names.value_prefix || '_' || time_slots.value_suffix,
        'labelKo',
        day_names.label_ko || ' - ' || time_slots.label,
        'labelEn',
        day_names.label_en || ' - ' || time_slots.label
      )
      order by day_names.day_order, time_slots.slot_order
    ) as options
  from day_names
  cross join time_slots
),
day_time_matrix as (
  select
    (
      select jsonb_agg(
        jsonb_build_object(
          'value',
          time_slots.value_suffix,
          'labelKo',
          time_slots.label,
          'labelEn',
          time_slots.label
        )
        order by time_slots.slot_order
      )
      from time_slots
    ) as matrix_rows,
    (
      select jsonb_agg(
        jsonb_build_object(
          'value',
          day_names.value_prefix,
          'labelKo',
          day_names.label_ko,
          'labelEn',
          day_names.label_en
        )
        order by day_names.day_order
      )
      from day_names
    ) as matrix_columns,
    day_time_options.options
  from day_time_options
)
update public.questions as q
set
  question_type = 'multi_select',
  title_ko = '주로 세탁기 및 건조기를 사용하는 요일과 시간대는 언제입니까? (중복 선택 가능)',
  title_en = 'What days and times do you primarily use the washing machines and dryers? (Multiple selections are allowed)',
  metric_type = 'none',
  topic_key = coalesce(q.topic_key, 'laundry'),
  config = (coalesce(q.config, '{}'::jsonb) - 'displayGroup' - 'displayGroupEn')
    || jsonb_build_object(
      'minSelect',
      0,
      'matrixRows',
      day_time_matrix.matrix_rows,
      'matrixColumns',
      day_time_matrix.matrix_columns,
      'matrixValueSeparator',
      '_',
      'options',
      day_time_matrix.options,
      'importSource',
      'handong-dom-survey-2026-1',
      'sourceNumber',
      154
    ),
  updated_at = now()
from day_time_matrix
where q.question_key = 'dorm_25_2_q154'
  and (
    q.config->>'importSource' = 'handong-dom-survey-2026-1'
    or q.config->>'sourceNumber' = '154'
    or q.title_ko like '주로 세탁기 및 건조기를 사용하는 요일과 시간대는 언제입니까?%'
  )
  and (
    q.question_type is distinct from 'multi_select'
    or q.title_ko is distinct from '주로 세탁기 및 건조기를 사용하는 요일과 시간대는 언제입니까? (중복 선택 가능)'
    or q.title_en is distinct from 'What days and times do you primarily use the washing machines and dryers? (Multiple selections are allowed)'
    or q.metric_type is distinct from 'none'
    or q.config->'options' is distinct from day_time_matrix.options
    or q.config->'matrixRows' is distinct from day_time_matrix.matrix_rows
    or q.config->'matrixColumns' is distinct from day_time_matrix.matrix_columns
    or q.config->>'matrixValueSeparator' is distinct from '_'
    or q.config->>'minSelect' is distinct from '0'
    or q.config ? 'displayGroup'
    or q.config ? 'displayGroupEn'
  );

with legacy_split_questions as (
  select q.id
  from public.questions as q
  where q.question_key in (
    'dorm_25_2_q155',
    'dorm_25_2_q156',
    'dorm_25_2_q157',
    'dorm_25_2_q158',
    'dorm_25_2_q159',
    'dorm_25_2_q160',
    'dorm_25_2_q161',
    'dorm_25_2_q162'
  )
    and (
      q.config->>'importSource' = 'handong-dom-survey-2026-1'
      or q.config->>'sourceNumber' in ('155', '156', '157', '158', '159', '160', '161', '162')
      or q.title_ko like '주로 세탁기 및 건조기를 사용하는 요일과 시간대는 언제입니까?%'
    )
    and not exists (
      select 1
      from public.answers as a
      where a.question_id = q.id
    )
)
delete from public.questions as q
using legacy_split_questions
where q.id = legacy_split_questions.id;

update public.questions as q
set
  is_required = false,
  config = coalesce(q.config, '{}'::jsonb)
    || jsonb_build_object(
      'legacyMergedIntoQuestionKey',
      'dorm_25_2_q154',
      'visibility',
      jsonb_build_object(
        'when',
        jsonb_build_object(
          'questionKey',
          '__legacy_laundry_split_disabled__',
          'operator',
          'eq',
          'value',
          'true'
        )
      )
    ),
  updated_at = now()
where q.question_key in (
    'dorm_25_2_q155',
    'dorm_25_2_q156',
    'dorm_25_2_q157',
    'dorm_25_2_q158',
    'dorm_25_2_q159',
    'dorm_25_2_q160',
    'dorm_25_2_q161',
    'dorm_25_2_q162'
  )
  and (
    q.config->>'importSource' = 'handong-dom-survey-2026-1'
    or q.config->>'sourceNumber' in ('155', '156', '157', '158', '159', '160', '161', '162')
    or q.title_ko like '주로 세탁기 및 건조기를 사용하는 요일과 시간대는 언제입니까?%'
  )
  and exists (
    select 1
    from public.answers as a
    where a.question_id = q.id
  )
  and (
    q.is_required is distinct from false
    or q.config->>'legacyMergedIntoQuestionKey' is distinct from 'dorm_25_2_q154'
  );

update public.analysis_answer_facts as fact
set
  question_title = '주로 세탁기 및 건조기를 사용하는 요일과 시간대는 언제입니까? (중복 선택 가능)',
  updated_at = now()
from public.questions as q
where fact.question_id = q.id
  and fact.survey_id = q.survey_id
  and q.question_key = 'dorm_25_2_q154'
  and (
    q.config->>'importSource' = 'handong-dom-survey-2026-1'
    or q.config->>'sourceNumber' = '154'
  )
  and fact.question_title is distinct from '주로 세탁기 및 건조기를 사용하는 요일과 시간대는 언제입니까? (중복 선택 가능)';

analyze public.questions;
analyze public.analysis_answer_facts;
