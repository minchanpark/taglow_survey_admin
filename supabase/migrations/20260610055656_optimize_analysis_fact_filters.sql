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
immutable
parallel safe
as $$
  select case
    when coalesce(p_filters, '{}'::jsonb) = '{}'::jsonb then true
    else
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
      and (nullif(p_filters->>'keyword', '') is null or coalesce(p_text_value, '') ilike '%' || (p_filters->>'keyword') || '%')
  end;
$$;

create or replace function private.analysis_score_for_average(
  p_score numeric,
  p_metric_type text,
  p_question_config jsonb
)
returns numeric
language sql
immutable
parallel safe
as $$
  select case
    when p_score is null then null
    when private.analysis_has_excluded_values(coalesce(p_question_config, '{}'::jsonb))
      and p_score = any(private.analysis_excluded_values(coalesce(p_question_config, '{}'::jsonb))) then null
    when coalesce(p_metric_type, '') = 'importance' then p_score
    when coalesce(private.analysis_scale_max(coalesce(p_question_config, '{}'::jsonb)), 5) >= 7
      and not private.analysis_has_excluded_values(coalesce(p_question_config, '{}'::jsonb))
      and p_score in (1, coalesce(private.analysis_scale_max(coalesce(p_question_config, '{}'::jsonb)), 7)) then null
    when coalesce(private.analysis_scale_max(coalesce(p_question_config, '{}'::jsonb)), 5) >= 7 then p_score - 1
    else p_score
  end;
$$;

create index if not exists idx_analysis_answer_facts_scale_metric_topic_response
on public.analysis_answer_facts (survey_id, metric_type, topic_key, response_id, question_id)
where answer_type = 'scale' and topic_key is not null and passed_attention_check = true;

create index if not exists idx_analysis_answer_facts_scale_satisfaction_section
on public.analysis_answer_facts (survey_id, section_id, question_id)
where answer_type = 'scale' and metric_type = 'satisfaction' and passed_attention_check = true;

analyze public.analysis_answer_facts;

notify pgrst, 'reload schema';
