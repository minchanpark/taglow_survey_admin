with fixed_questions(question_key, title_ko, title_en, display_group_ko, display_group_en) as (
  values
    (
      'dorm_25_2_q033',
      '침묵시간 운영시간',
      'Silent Hours Operating Hours',
      '''침묵시간''과 관련된 다음 항목에 대한 만족도에 대해 어떻게 생각하십니까?',
      'What is your level of satisfaction with the following aspects related to ''Silent Hours''?'
    ),
    (
      'dorm_25_2_q034',
      '침묵시간 규칙 준수',
      'Compliance with Silent Hours Rules',
      '''침묵시간''과 관련된 다음 항목에 대한 만족도에 대해 어떻게 생각하십니까?',
      'What is your level of satisfaction with the following aspects related to ''Silent Hours''?'
    ),
    (
      'dorm_25_2_q035',
      '침묵시간 관리 방법',
      'Management of Silent Hours',
      '''침묵시간''과 관련된 다음 항목에 대한 만족도에 대해 어떻게 생각하십니까?',
      'What is your level of satisfaction with the following aspects related to ''Silent Hours''?'
    ),
    (
      'dorm_25_2_q036',
      '침묵시간 효과성',
      'Effectiveness of Silent Hours',
      '''침묵시간''과 관련된 다음 항목에 대한 만족도에 대해 어떻게 생각하십니까?',
      'What is your level of satisfaction with the following aspects related to ''Silent Hours''?'
    )
)
update public.questions as q
set
  title_ko = f.title_ko,
  title_en = f.title_en,
  config = jsonb_set(
    jsonb_set(coalesce(q.config, '{}'::jsonb), '{displayGroup}', to_jsonb(f.display_group_ko), true),
    '{displayGroupEn}',
    to_jsonb(f.display_group_en),
    true
  ),
  updated_at = now()
from fixed_questions as f
where q.question_key = f.question_key
  and q.config->>'importSource' = 'handong-dom-survey-2026-1'
  and (
    q.title_ko is distinct from f.title_ko
    or q.title_en is distinct from f.title_en
    or q.config->>'displayGroup' is distinct from f.display_group_ko
    or q.config->>'displayGroupEn' is distinct from f.display_group_en
  );

with fixed_questions(question_key, title_ko) as (
  values
    ('dorm_25_2_q033', '침묵시간 운영시간'),
    ('dorm_25_2_q034', '침묵시간 규칙 준수'),
    ('dorm_25_2_q035', '침묵시간 관리 방법'),
    ('dorm_25_2_q036', '침묵시간 효과성')
)
update public.analysis_answer_facts as fact
set
  question_title = f.title_ko,
  updated_at = now()
from public.questions as q
join fixed_questions as f on f.question_key = q.question_key
where fact.question_id = q.id
  and fact.survey_id = q.survey_id
  and q.config->>'importSource' = 'handong-dom-survey-2026-1'
  and fact.question_title is distinct from f.title_ko;

analyze public.questions;
analyze public.analysis_answer_facts;
