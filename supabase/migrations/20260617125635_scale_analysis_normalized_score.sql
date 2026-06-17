alter table public.analysis_answer_facts
add column if not exists normalized_score numeric,
add column if not exists section_order integer,
add column if not exists question_order integer;

update public.analysis_answer_facts as fact
set
  normalized_score = case
    when fact.answer_type = 'scale' then private.analysis_score_for_average(fact.score_value, fact.metric_type, question.config)
    else null
  end,
  section_order = section.order_index,
  question_order = question.order_index,
  updated_at = now()
from public.questions as question
left join public.survey_sections as section
  on section.id = question.section_id
  and section.survey_id = question.survey_id
where question.id = fact.question_id
  and question.survey_id = fact.survey_id
  and (
    fact.normalized_score is distinct from case
      when fact.answer_type = 'scale' then private.analysis_score_for_average(fact.score_value, fact.metric_type, question.config)
      else null
    end
    or fact.section_order is distinct from section.order_index
    or fact.question_order is distinct from question.order_index
  );

create index if not exists idx_analysis_answer_facts_scale_satisfaction_norm
on public.analysis_answer_facts (
  survey_id,
  section_id,
  question_id
)
include (
  normalized_score,
  section_order,
  question_order,
  section_title,
  question_title,
  topic_key,
  gender,
  semester_group,
  department,
  rc,
  dormitory,
  room_type,
  dorm_experience
)
where answer_type = 'scale'
  and metric_type = 'satisfaction'
  and passed_attention_check = true
  and normalized_score is not null;

create index if not exists idx_analysis_answer_facts_scale_profile_norm
on public.analysis_answer_facts (
  survey_id,
  metric_type,
  gender,
  semester_group,
  department,
  rc,
  dormitory,
  room_type,
  dorm_experience
)
include (
  normalized_score,
  section_id,
  question_id,
  topic_key,
  response_id,
  section_title,
  question_title,
  section_order,
  question_order
)
where answer_type = 'scale'
  and passed_attention_check = true
  and normalized_score is not null;

create index if not exists idx_analysis_answer_facts_scale_topic_response_norm
on public.analysis_answer_facts (
  survey_id,
  topic_key,
  response_id,
  metric_type
)
include (
  normalized_score,
  section_id,
  question_id,
  section_title,
  question_title,
  gender,
  semester_group,
  department,
  rc,
  dormitory,
  room_type,
  dorm_experience
)
where answer_type = 'scale'
  and topic_key is not null
  and passed_attention_check = true
  and normalized_score is not null;

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
    normalized_score,
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
    section_order,
    question_order,
    updated_at
  )
  select
    answer.id,
    answer.survey_id,
    answer.response_id,
    answer.section_id,
    answer.question_id,
    answer.asset_id,
    answer.answer_type,
    coalesce(answer.metric_type, 'none'),
    answer.topic_key,
    answer.space_key,
    answer.score_value,
    case
      when answer.answer_type = 'scale' then private.analysis_score_for_average(answer.score_value, coalesce(answer.metric_type, 'none'), question.config)
      else null
    end,
    answer.text_value,
    answer.choice_value,
    answer.x_ratio,
    answer.y_ratio,
    answer.tag_type,
    answer.severity,
    coalesce(answer.value_json, '{}'::jsonb),
    answer.created_at,
    v_response.submitted_at,
    private.analysis_filter_value(v_response, 'gender'),
    private.analysis_filter_value(v_response, 'semester_group'),
    private.analysis_filter_value(v_response, 'department'),
    private.analysis_filter_value(v_response, 'rc'),
    private.analysis_filter_value(v_response, 'dormitory'),
    private.analysis_filter_value(v_response, 'room_type'),
    private.analysis_filter_value(v_response, 'dorm_experience'),
    v_passed,
    question.question_type,
    question.title_ko,
    section.title_ko,
    section.order_index,
    question.order_index,
    now()
  from public.answers as answer
  left join public.questions as question
    on question.id = answer.question_id
    and question.survey_id = answer.survey_id
  left join public.survey_sections as section
    on section.id = answer.section_id
    and section.survey_id = answer.survey_id
  where answer.response_id = p_response_id;
end;
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
    max(a.section_title) as section_title,
    round(avg(a.normalized_score), 2) as avg_score,
    count(*)::bigint as n
  from public.analysis_answer_facts a
  where a.survey_id = p_survey_id
    and a.passed_attention_check = true
    and a.answer_type = 'scale'
    and a.metric_type = 'satisfaction'
    and a.normalized_score is not null
    and private.analysis_fact_matches_filters(
      a.gender, a.semester_group, a.department, a.rc, a.dormitory, a.room_type, a.dorm_experience,
      a.section_id, a.question_id, a.asset_id, a.topic_key, a.space_key, a.tag_type, a.metric_type, a.text_value, p_filters
    )
  group by a.section_id
  order by max(a.section_order) nulls last, section_title;
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
    max(a.question_title) as question_title,
    a.section_id,
    max(a.section_title) as section_title,
    a.topic_key,
    a.metric_type,
    round(avg(a.normalized_score), 2) as avg_score,
    coalesce(round(stddev_samp(a.normalized_score), 2), 0) as stddev_score,
    count(*)::bigint as n
  from public.analysis_answer_facts a
  where a.survey_id = p_survey_id
    and a.passed_attention_check = true
    and a.answer_type = 'scale'
    and a.metric_type <> 'importance'
    and a.normalized_score is not null
    and private.analysis_fact_matches_filters(
      a.gender, a.semester_group, a.department, a.rc, a.dormitory, a.room_type, a.dorm_experience,
      a.section_id, a.question_id, a.asset_id, a.topic_key, a.space_key, a.tag_type, a.metric_type, a.text_value, p_filters
    )
  group by a.question_id, a.section_id, a.topic_key, a.metric_type
  order by max(a.section_order) nulls last, max(a.question_order) nulls last, question_title;
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
      round(avg(a.normalized_score), 2) as avg_score,
      count(*)::bigint as n
    from public.analysis_answer_facts a
    where a.survey_id = p_survey_id
      and a.passed_attention_check = true
      and a.answer_type = 'scale'
      and a.metric_type = coalesce(nullif(p_filters->>'metric_type', ''), 'satisfaction')
      and a.normalized_score is not null
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

create or replace function public.get_borich_summary(p_survey_id uuid, p_filters jsonb default '{}'::jsonb)
returns table (
  topic_key text,
  avg_importance numeric,
  avg_satisfaction numeric,
  avg_gap numeric,
  borich_score numeric,
  n bigint
)
language sql
stable
set search_path to 'private', 'public'
as $$
  with scored_answers as (
    select
      a.response_id,
      a.topic_key,
      a.metric_type,
      a.normalized_score as score
    from public.analysis_answer_facts a
    where a.survey_id = p_survey_id
      and a.passed_attention_check = true
      and a.answer_type = 'scale'
      and a.metric_type in ('importance', 'satisfaction')
      and a.topic_key is not null
      and a.normalized_score is not null
      and private.analysis_fact_matches_filters(
        a.gender, a.semester_group, a.department, a.rc, a.dormitory, a.room_type, a.dorm_experience,
        a.section_id, a.question_id, a.asset_id, a.topic_key, a.space_key, a.tag_type, a.metric_type, a.text_value, p_filters
      )
  ),
  pairs as (
    select
      response_id,
      topic_key,
      avg(score) filter (where metric_type = 'importance') as importance,
      avg(score) filter (where metric_type = 'satisfaction') as satisfaction
    from scored_answers
    group by response_id, topic_key
  ),
  complete_pairs as (
    select *
    from pairs
    where importance is not null and satisfaction is not null
  )
  select
    complete_pairs.topic_key,
    round(avg(importance)::numeric, 2) as avg_importance,
    round(avg(satisfaction)::numeric, 2) as avg_satisfaction,
    round((avg(importance) - avg(satisfaction))::numeric, 2) as avg_gap,
    round((avg(importance) * (avg(importance) - avg(satisfaction)))::numeric, 2) as borich_score,
    count(*)::bigint as n
  from complete_pairs
  group by complete_pairs.topic_key
  order by borich_score desc nulls last, n desc;
$$;

create or replace function public.get_locus_summary(p_survey_id uuid, p_filters jsonb default '{}'::jsonb)
returns table (
  topic_key text,
  label text,
  avg_importance numeric,
  avg_satisfaction numeric,
  avg_gap numeric,
  n bigint,
  quadrant text
)
language sql
stable
set search_path to 'private', 'public'
as $$
  with borich as (
    select *
    from public.get_borich_summary(p_survey_id, p_filters)
  ),
  center as (
    select avg(avg_importance) as importance_center, avg(avg_satisfaction) as satisfaction_center
    from borich
  )
  select
    borich.topic_key,
    borich.topic_key as label,
    borich.avg_importance,
    borich.avg_satisfaction,
    borich.avg_gap,
    borich.n,
    case
      when borich.avg_importance >= center.importance_center and borich.avg_satisfaction <= center.satisfaction_center then 'top_priority'
      when borich.avg_importance >= center.importance_center and borich.avg_satisfaction > center.satisfaction_center then 'maintain_strengthen'
      when borich.avg_importance < center.importance_center and borich.avg_satisfaction <= center.satisfaction_center then 'gradual_improvement'
      else 'maintain'
    end as quadrant
  from borich
  cross join center
  order by borich.avg_importance desc nulls last, borich.avg_satisfaction asc nulls last;
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
      round(avg(a.normalized_score), 2) as avg_satisfaction,
      count(*)::bigint as n_satisfaction
    from public.analysis_answer_facts a
    where a.survey_id = p_survey_id
      and a.passed_attention_check = true
      and a.answer_type = 'scale'
      and a.metric_type = 'satisfaction'
      and a.normalized_score is not null
      and private.analysis_fact_matches_filters(
        a.gender, a.semester_group, a.department, a.rc, a.dormitory, a.room_type, a.dorm_experience,
        a.section_id, a.question_id, a.asset_id, a.topic_key, a.space_key, a.tag_type, a.metric_type, a.text_value, p_filters
      )
    group by coalesce(a.topic_key, a.question_id::text)
  ),
  importance as (
    select
      coalesce(a.topic_key, a.question_id::text) as key,
      round(avg(a.normalized_score), 2) as avg_importance,
      count(*)::bigint as n_importance
    from public.analysis_answer_facts a
    where a.survey_id = p_survey_id
      and a.passed_attention_check = true
      and a.answer_type = 'scale'
      and a.metric_type = 'importance'
      and a.normalized_score is not null
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
      and private.analysis_image_tag_passes_attention(a.answer_type, a.passed_attention_check)
      and a.answer_type in ('image_tag', 'participant_image_tag')
      and private.analysis_fact_matches_filters(
        a.gender, a.semester_group, a.department, a.rc, a.dormitory, a.room_type, a.dorm_experience,
        a.section_id, a.question_id, a.asset_id, a.topic_key, a.space_key, a.tag_type, a.metric_type, a.text_value, p_filters
      )
    group by coalesce(a.topic_key, a.question_id::text)
  ),
  keys as (
    select key from satisfaction
    union
    select key from importance
    union
    select key from text_counts
    union
    select key from tag_counts
  ),
  combined as (
    select
      keys.key,
      coalesce(satisfaction.label, keys.key) as label,
      satisfaction.topic_key,
      satisfaction.section_title,
      importance.avg_importance,
      satisfaction.avg_satisfaction,
      greatest(coalesce(satisfaction.n_satisfaction, 0), coalesce(importance.n_importance, 0))::bigint as scale_n,
      coalesce(text_counts.text_count, 0)::bigint as text_count,
      coalesce(tag_counts.tag_count, 0)::bigint as tag_count
    from keys
    left join satisfaction on satisfaction.key = keys.key
    left join importance on importance.key = keys.key
    left join text_counts on text_counts.key = keys.key
    left join tag_counts on tag_counts.key = keys.key
  )
  select
    key as id,
    label,
    case
      when avg_importance is not null and avg_satisfaction is not null and (text_count > 0 or tag_count > 0) then 'mixed'
      when avg_importance is not null and avg_satisfaction is not null then 'borich'
      when tag_count > 0 and avg_satisfaction is null then 'heatmap'
      when text_count > 0 and avg_satisfaction is null then 'text'
      else 'low_satisfaction'
    end as source,
    topic_key,
    section_title,
    avg_importance,
    avg_satisfaction,
    case when avg_importance is not null and avg_satisfaction is not null then round((avg_importance - avg_satisfaction)::numeric, 2) end as avg_gap,
    case when avg_importance is not null and avg_satisfaction is not null then round((avg_importance * greatest(0, avg_importance - avg_satisfaction))::numeric, 2) end as borich_score,
    text_count,
    tag_count,
    greatest(scale_n, text_count, tag_count)::bigint as n
  from combined
  order by
    coalesce(
      case when avg_importance is not null and avg_satisfaction is not null then avg_importance * greatest(0, avg_importance - avg_satisfaction) end,
      0
    )
      + greatest(0, 5 - coalesce(avg_satisfaction, 5)) * 1.25
      + (text_count * 0.08)
      + (tag_count * 0.08) desc,
    n desc,
    label
  limit 5;
$$;

grant execute on function public.get_section_satisfaction_summary(uuid, jsonb) to authenticated;
grant execute on function public.get_question_satisfaction_summary(uuid, jsonb) to authenticated;
grant execute on function public.get_group_compare_summary(uuid, jsonb) to authenticated;
grant execute on function public.get_borich_summary(uuid, jsonb) to authenticated;
grant execute on function public.get_locus_summary(uuid, jsonb) to authenticated;
grant execute on function public.get_priority_top5(uuid, jsonb) to authenticated;

analyze public.analysis_answer_facts;

notify pgrst, 'reload schema';
