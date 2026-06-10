create or replace function private.analysis_image_tag_passes_attention(
  p_answer_type text,
  p_passed_attention_check boolean
)
returns boolean
language sql
immutable
parallel safe
as $$
  select coalesce(p_passed_attention_check, false)
    or coalesce(p_answer_type, '') = 'participant_image_tag';
$$;

create or replace function public.get_heatmap_points(p_survey_id uuid, p_filters jsonb default '{}'::jsonb)
returns table (
  answer_id uuid,
  asset_id uuid,
  x_ratio numeric,
  y_ratio numeric,
  tag_type text,
  severity smallint,
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
    a.answer_id,
    a.asset_id,
    a.x_ratio,
    a.y_ratio,
    a.tag_type,
    a.severity,
    a.text_value,
    a.dormitory,
    a.room_type,
    a.rc,
    private.analysis_response_profile_json(a.gender, a.semester_group, a.department, a.rc, a.dormitory, a.room_type, a.dorm_experience) as response_profile
  from public.analysis_answer_facts a
  where a.survey_id = p_survey_id
    and private.analysis_image_tag_passes_attention(a.answer_type, a.passed_attention_check)
    and a.answer_type in ('image_tag', 'participant_image_tag')
    and a.x_ratio between 0 and 1
    and a.y_ratio between 0 and 1
    and private.analysis_fact_matches_filters(
      a.gender, a.semester_group, a.department, a.rc, a.dormitory, a.room_type, a.dorm_experience,
      a.section_id, a.question_id, a.asset_id, a.topic_key, a.space_key, a.tag_type, a.metric_type, a.text_value, p_filters
    )
  order by a.created_at desc
  limit 500;
$$;

create or replace function public.get_image_tag_answers(p_survey_id uuid, p_filters jsonb default '{}'::jsonb)
returns table (
  answer_id uuid,
  response_id uuid,
  section_id uuid,
  section_title text,
  question_id uuid,
  question_title text,
  question_type text,
  asset_id uuid,
  answer_type text,
  x_ratio numeric,
  y_ratio numeric,
  tag_type text,
  severity smallint,
  text_value text,
  value_json jsonb,
  image_storage_bucket text,
  image_storage_path text,
  image_signed_url text,
  dormitory text,
  room_type text,
  rc text,
  department text,
  response_profile jsonb,
  created_at timestamptz,
  next_cursor text
)
language sql
stable
set search_path to 'private', 'public'
as $$
  with params as (
    select
      least(greatest(coalesce(nullif(p_filters->>'limit', '')::integer, 50), 1), 100) as page_size,
      private.analysis_cursor_created_at(nullif(p_filters->>'cursor', '')) as cursor_created_at,
      private.analysis_cursor_answer_id(nullif(p_filters->>'cursor', '')) as cursor_answer_id
  ),
  rows as (
    select
      a.*,
      sa.storage_bucket,
      sa.storage_path,
      coalesce(
        nullif(a.value_json #>> '{image,storagePath}', ''),
        nullif(a.value_json #>> '{image,storage_path}', ''),
        nullif(a.value_json #>> '{image,path}', ''),
        nullif(a.value_json #>> '{uploadedImage,storagePath}', ''),
        nullif(a.value_json #>> '{uploadedImage,storage_path}', ''),
        nullif(a.value_json #>> '{uploaded_image,storagePath}', ''),
        nullif(a.value_json #>> '{uploaded_image,storage_path}', ''),
        nullif(a.value_json #>> '{uploaded_image,path}', ''),
        nullif(a.value_json #>> '{participantImage,storagePath}', ''),
        nullif(a.value_json #>> '{participantImage,storage_path}', ''),
        nullif(a.value_json #>> '{participant_image,storagePath}', ''),
        nullif(a.value_json #>> '{participant_image,storage_path}', ''),
        nullif(a.value_json #>> '{participant_image,path}', ''),
        nullif(a.value_json #>> '{tags,0,image,storagePath}', ''),
        nullif(a.value_json #>> '{tags,0,image,storage_path}', ''),
        nullif(a.value_json #>> '{tags,0,image,path}', ''),
        sa.storage_path
      ) as resolved_storage_path,
      coalesce(
        nullif(a.value_json #>> '{image,storageBucket}', ''),
        nullif(a.value_json #>> '{image,storage_bucket}', ''),
        nullif(a.value_json #>> '{uploadedImage,storageBucket}', ''),
        nullif(a.value_json #>> '{uploadedImage,storage_bucket}', ''),
        nullif(a.value_json #>> '{uploaded_image,storageBucket}', ''),
        nullif(a.value_json #>> '{uploaded_image,storage_bucket}', ''),
        nullif(a.value_json #>> '{participantImage,storageBucket}', ''),
        nullif(a.value_json #>> '{participantImage,storage_bucket}', ''),
        nullif(a.value_json #>> '{participant_image,storageBucket}', ''),
        nullif(a.value_json #>> '{participant_image,storage_bucket}', ''),
        nullif(a.value_json #>> '{tags,0,image,storageBucket}', ''),
        nullif(a.value_json #>> '{tags,0,image,storage_bucket}', ''),
        sa.storage_bucket
      ) as resolved_storage_bucket,
      coalesce(
        nullif(a.value_json #>> '{image,signedUrl}', ''),
        nullif(a.value_json #>> '{image,signed_url}', ''),
        nullif(a.value_json #>> '{uploadedImage,signedUrl}', ''),
        nullif(a.value_json #>> '{uploadedImage,signed_url}', ''),
        nullif(a.value_json #>> '{uploaded_image,signedUrl}', ''),
        nullif(a.value_json #>> '{uploaded_image,signed_url}', ''),
        nullif(a.value_json #>> '{participantImage,signedUrl}', ''),
        nullif(a.value_json #>> '{participantImage,signed_url}', ''),
        nullif(a.value_json #>> '{participant_image,signedUrl}', ''),
        nullif(a.value_json #>> '{participant_image,signed_url}', ''),
        nullif(a.value_json #>> '{tags,0,image,signedUrl}', ''),
        nullif(a.value_json #>> '{tags,0,image,signed_url}', '')
      ) as resolved_signed_url,
      row_number() over (order by a.created_at desc, a.answer_id desc) as rn
    from public.analysis_answer_facts a
    left join public.survey_assets sa on sa.id = a.asset_id and sa.survey_id = a.survey_id
    cross join params p
    where a.survey_id = p_survey_id
      and private.analysis_image_tag_passes_attention(a.answer_type, a.passed_attention_check)
      and a.answer_type in ('image_tag', 'participant_image_tag')
      and a.x_ratio between 0 and 1
      and a.y_ratio between 0 and 1
      and (p.cursor_created_at is null or (a.created_at, a.answer_id) < (p.cursor_created_at, p.cursor_answer_id))
      and private.analysis_fact_matches_filters(
        a.gender, a.semester_group, a.department, a.rc, a.dormitory, a.room_type, a.dorm_experience,
        a.section_id, a.question_id, a.asset_id, a.topic_key, a.space_key, a.tag_type, a.metric_type, a.text_value, p_filters
      )
    order by a.created_at desc, a.answer_id desc
    limit (select page_size + 1 from params)
  ),
  page_rows as (
    select *
    from rows
    where rn <= (select page_size from params)
  ),
  cursor_row as (
    select private.analysis_next_cursor(p_created_at := created_at, p_answer_id := answer_id) as cursor_value
    from page_rows
    order by created_at asc, answer_id asc
    limit 1
  )
  select
    a.answer_id,
    a.response_id,
    a.section_id,
    a.section_title,
    a.question_id,
    a.question_title,
    a.question_type,
    a.asset_id,
    a.answer_type,
    a.x_ratio,
    a.y_ratio,
    a.tag_type,
    a.severity,
    a.text_value,
    a.value_json,
    coalesce(a.resolved_storage_bucket, case when a.resolved_storage_path is not null then 'survey-assets' end) as image_storage_bucket,
    a.resolved_storage_path as image_storage_path,
    a.resolved_signed_url as image_signed_url,
    a.dormitory,
    a.room_type,
    a.rc,
    a.department,
    private.analysis_response_profile_json(a.gender, a.semester_group, a.department, a.rc, a.dormitory, a.room_type, a.dorm_experience) as response_profile,
    a.created_at,
    case when (select count(*) from rows) > (select page_size from params) then (select cursor_value from cursor_row) end as next_cursor
  from page_rows a
  order by a.created_at desc, a.answer_id desc;
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
      round(avg(scored.score), 2) as avg_satisfaction,
      count(*)::bigint as n_satisfaction
    from public.analysis_answer_facts a
    join public.questions q on q.id = a.question_id and q.survey_id = a.survey_id
    cross join lateral (
      select private.analysis_score_for_average(a.score_value, a.metric_type, q.config) as score
    ) scored
    where a.survey_id = p_survey_id
      and a.passed_attention_check = true
      and a.answer_type = 'scale'
      and a.metric_type = 'satisfaction'
      and scored.score is not null
      and private.analysis_fact_matches_filters(
        a.gender, a.semester_group, a.department, a.rc, a.dormitory, a.room_type, a.dorm_experience,
        a.section_id, a.question_id, a.asset_id, a.topic_key, a.space_key, a.tag_type, a.metric_type, a.text_value, p_filters
      )
    group by coalesce(a.topic_key, a.question_id::text)
  ),
  importance as (
    select
      coalesce(a.topic_key, a.question_id::text) as key,
      round(avg(scored.score), 2) as avg_importance,
      count(*)::bigint as n_importance
    from public.analysis_answer_facts a
    join public.questions q on q.id = a.question_id and q.survey_id = a.survey_id
    cross join lateral (
      select private.analysis_score_for_average(a.score_value, a.metric_type, q.config) as score
    ) scored
    where a.survey_id = p_survey_id
      and a.passed_attention_check = true
      and a.answer_type = 'scale'
      and a.metric_type = 'importance'
      and scored.score is not null
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

grant execute on function private.analysis_image_tag_passes_attention(text, boolean) to authenticated;
grant execute on function public.get_heatmap_points(uuid, jsonb) to authenticated;
grant execute on function public.get_image_tag_answers(uuid, jsonb) to authenticated;
grant execute on function public.get_priority_top5(uuid, jsonb) to authenticated;

notify pgrst, 'reload schema';
