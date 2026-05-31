create or replace function public.get_section_satisfaction_summary(p_survey_id uuid, p_filters jsonb default '{}'::jsonb)
returns table(section_id uuid, section_title text, avg_score numeric, n bigint)
language sql
stable
set search_path to 'private', 'public'
as $$
  select
    a.section_id,
    coalesce(s.title_ko, '섹션 미지정') as section_title,
    round(avg(a.score_value)::numeric, 2) as avg_score,
    count(*)::bigint as n
  from public.answers a
  join public.responses r on r.id = a.response_id and r.survey_id = a.survey_id
  left join public.survey_sections s on s.id = a.section_id
  where a.survey_id = p_survey_id
    and r.status = 'submitted'
    and a.answer_type = 'scale'
    and a.metric_type = 'satisfaction'
    and a.score_value is not null
    and private.matches_analysis_profile_filters(r, p_filters)
    and private.matches_analysis_answer_filters(a, p_filters)
  group by a.section_id, s.title_ko
  order by avg_score asc nulls last, n desc;
$$;

create or replace function public.get_borich_summary(p_survey_id uuid, p_filters jsonb default '{}'::jsonb)
returns table(
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
  with pairs as (
    select
      a.response_id,
      a.topic_key,
      avg(a.score_value) filter (where a.metric_type = 'importance') as importance,
      avg(a.score_value) filter (where a.metric_type = 'satisfaction') as satisfaction
    from public.answers a
    join public.responses r on r.id = a.response_id and r.survey_id = a.survey_id
    where a.survey_id = p_survey_id
      and r.status = 'submitted'
      and a.answer_type = 'scale'
      and a.metric_type in ('importance', 'satisfaction')
      and a.topic_key is not null
      and a.score_value is not null
      and private.matches_analysis_profile_filters(r, p_filters)
      and private.matches_analysis_answer_filters(a, p_filters)
    group by a.response_id, a.topic_key
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
returns table(
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

drop function if exists public.get_priority_top5(uuid, jsonb);

create or replace function public.get_priority_top5(p_survey_id uuid, p_filters jsonb default '{}'::jsonb)
returns table(
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
  with scale_answers as (
    select
      a.*,
      coalesce(
        nullif(a.topic_key, '') || coalesce(':' || nullif(a.space_key, ''), ''),
        a.section_id::text,
        a.question_id::text
      ) as priority_key
    from public.answers a
    join public.responses r on r.id = a.response_id and r.survey_id = a.survey_id
    where a.survey_id = p_survey_id
      and r.status = 'submitted'
      and a.answer_type = 'scale'
      and a.score_value is not null
      and private.matches_analysis_profile_filters(r, p_filters)
      and private.matches_analysis_answer_filters(a, p_filters)
  ),
  satisfaction as (
    select
      priority_key,
      avg(score_value) as avg_satisfaction,
      count(*)::bigint as n_satisfaction
    from scale_answers
    where metric_type = 'satisfaction'
    group by priority_key
  ),
  importance as (
    select
      priority_key,
      avg(score_value) as avg_importance,
      count(*)::bigint as n_importance
    from scale_answers
    where metric_type = 'importance'
    group by priority_key
  ),
  question_labels as (
    select
      coalesce(
        nullif(q.topic_key, '') || coalesce(':' || nullif(q.space_key, ''), ''),
        q.section_id::text,
        q.id::text
      ) as priority_key,
      (array_agg(
        coalesce(nullif(q.config->>'displayGroup', ''), s.title_ko, q.title_ko)
        order by
          case
            when q.question_type = 'scale' then 0
            when q.question_type = 'text' then 1
            else 2
          end,
          case q.metric_type when 'satisfaction' then 0 when 'importance' then 1 else 2 end,
          q.order_index
      ))[1] as label,
      (array_agg(nullif(q.topic_key, '') order by q.order_index))[1] as topic_key,
      (array_agg(s.title_ko order by q.order_index))[1] as section_title
    from public.questions q
    left join public.survey_sections s on s.id = q.section_id
    where q.survey_id = p_survey_id
    group by coalesce(
      nullif(q.topic_key, '') || coalesce(':' || nullif(q.space_key, ''), ''),
      q.section_id::text,
      q.id::text
    )
  ),
  text_counts as (
    select
      coalesce(
        nullif(a.topic_key, '') || coalesce(':' || nullif(a.space_key, ''), ''),
        a.section_id::text,
        a.question_id::text
      ) as priority_key,
      count(*)::bigint as text_count
    from public.answers a
    join public.responses r on r.id = a.response_id and r.survey_id = a.survey_id
    where a.survey_id = p_survey_id
      and r.status = 'submitted'
      and a.answer_type = 'text'
      and nullif(a.text_value, '') is not null
      and private.matches_analysis_profile_filters(r, p_filters)
      and private.matches_analysis_answer_filters(a, p_filters)
    group by coalesce(
      nullif(a.topic_key, '') || coalesce(':' || nullif(a.space_key, ''), ''),
      a.section_id::text,
      a.question_id::text
    )
  ),
  tag_counts as (
    select
      coalesce(
        nullif(a.topic_key, '') || coalesce(':' || nullif(a.space_key, ''), ''),
        a.asset_id::text,
        a.question_id::text
      ) as priority_key,
      count(*)::bigint as tag_count,
      avg(a.severity) as avg_severity
    from public.answers a
    join public.responses r on r.id = a.response_id and r.survey_id = a.survey_id
    where a.survey_id = p_survey_id
      and r.status = 'submitted'
      and a.answer_type in ('image_tag', 'participant_image_tag')
      and private.matches_analysis_profile_filters(r, p_filters)
      and private.matches_analysis_answer_filters(a, p_filters)
    group by coalesce(
      nullif(a.topic_key, '') || coalesce(':' || nullif(a.space_key, ''), ''),
      a.asset_id::text,
      a.question_id::text
    )
  ),
  keys as (
    select priority_key from satisfaction
    union
    select priority_key from importance
    union
    select priority_key from text_counts
    union
    select priority_key from tag_counts
  ),
  merged as (
    select
      keys.priority_key,
      labels.label,
      labels.topic_key,
      labels.section_title,
      satisfaction.avg_satisfaction,
      satisfaction.n_satisfaction,
      importance.avg_importance,
      importance.n_importance,
      case
        when importance.avg_importance is not null and satisfaction.avg_satisfaction is not null
          then importance.avg_importance - satisfaction.avg_satisfaction
        else null
      end as avg_gap,
      case
        when importance.avg_importance is not null and satisfaction.avg_satisfaction is not null
          then importance.avg_importance * greatest(0, importance.avg_importance - satisfaction.avg_satisfaction)
        else null
      end as borich_score,
      coalesce(text_counts.text_count, 0)::bigint as text_count,
      coalesce(tag_counts.tag_count, 0)::bigint as tag_count,
      coalesce(tag_counts.avg_severity, 0) as avg_severity
    from keys
    left join satisfaction on satisfaction.priority_key = keys.priority_key
    left join importance on importance.priority_key = keys.priority_key
    left join text_counts on text_counts.priority_key = keys.priority_key
    left join tag_counts on tag_counts.priority_key = keys.priority_key
    left join question_labels labels on labels.priority_key = keys.priority_key
  ),
  scored as (
    select
      *,
      coalesce(borich_score, 0)
        + (greatest(0, 5 - coalesce(avg_satisfaction, 5)) * 1.25)
        + (coalesce(avg_importance, 0) * 0.2)
        + (text_count * 0.08)
        + (tag_count * 0.12)
        + (avg_severity * 0.15) as priority_score
    from merged
  )
  select
    priority_key as id,
    coalesce(label, topic_key, priority_key) as label,
    case
      when borich_score is not null and (text_count > 0 or tag_count > 0) then 'mixed'
      when borich_score is not null then 'borich'
      when tag_count > 0 and avg_satisfaction is null then 'heatmap'
      when text_count > 0 and avg_satisfaction is null then 'text'
      else 'low_satisfaction'
    end as source,
    topic_key,
    section_title,
    round(avg_importance::numeric, 2) as avg_importance,
    round(avg_satisfaction::numeric, 2) as avg_satisfaction,
    round(avg_gap::numeric, 2) as avg_gap,
    round(borich_score::numeric, 2) as borich_score,
    text_count,
    tag_count,
    greatest(coalesce(n_satisfaction, 0), coalesce(n_importance, 0), text_count, tag_count)::bigint as n
  from scored
  where priority_key is not null
  order by priority_score desc nulls last,
    greatest(coalesce(n_satisfaction, 0), coalesce(n_importance, 0), text_count, tag_count) desc,
    coalesce(label, topic_key, priority_key)
  limit 5;
$$;

drop function if exists public.get_heatmap_points(uuid, jsonb);

create or replace function public.get_heatmap_points(p_survey_id uuid, p_filters jsonb default '{}'::jsonb)
returns table(
  answer_id uuid,
  asset_id uuid,
  x_ratio numeric,
  y_ratio numeric,
  tag_type text,
  severity integer,
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
    a.id as answer_id,
    a.asset_id,
    a.x_ratio,
    a.y_ratio,
    a.tag_type,
    a.severity::integer,
    a.text_value,
    private.analysis_filter_value(r, 'dormitory') as dormitory,
    private.analysis_filter_value(r, 'room_type') as room_type,
    private.analysis_filter_value(r, 'rc') as rc,
    jsonb_strip_nulls(jsonb_build_object(
      'gender', private.analysis_filter_value(r, 'gender'),
      'semesterGroup', private.analysis_filter_value(r, 'semester_group'),
      'department', private.analysis_filter_value(r, 'department'),
      'rc', private.analysis_filter_value(r, 'rc'),
      'dormitory', private.analysis_filter_value(r, 'dormitory'),
      'roomType', private.analysis_filter_value(r, 'room_type'),
      'dormExperience', private.analysis_filter_value(r, 'dorm_experience')
    )) as response_profile
  from public.answers a
  join public.responses r on r.id = a.response_id and r.survey_id = a.survey_id
  where a.survey_id = p_survey_id
    and r.status = 'submitted'
    and a.answer_type in ('image_tag', 'participant_image_tag')
    and a.x_ratio between 0 and 1
    and a.y_ratio between 0 and 1
    and private.matches_analysis_profile_filters(r, p_filters)
    and private.matches_analysis_answer_filters(a, p_filters)
  order by a.created_at desc;
$$;

drop function if exists public.get_image_tag_answers(uuid, jsonb);

create or replace function public.get_image_tag_answers(p_survey_id uuid, p_filters jsonb default '{}'::jsonb)
returns table(
  answer_id uuid,
  id uuid,
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
  severity integer,
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
  created_at timestamptz
)
language sql
stable
set search_path to 'private', 'public'
as $$
  select
    a.id as answer_id,
    a.id,
    a.response_id,
    a.section_id,
    s.title_ko as section_title,
    a.question_id,
    q.title_ko as question_title,
    q.question_type,
    a.asset_id,
    a.answer_type,
    a.x_ratio,
    a.y_ratio,
    a.tag_type,
    a.severity::integer,
    a.text_value,
    coalesce(a.value_json, '{}'::jsonb) as value_json,
    coalesce(
      nullif(a.value_json #>> '{image,storageBucket}', ''),
      nullif(a.value_json #>> '{image,storage_bucket}', ''),
      nullif(a.value_json #>> '{uploadedImage,storageBucket}', ''),
      nullif(a.value_json #>> '{uploaded_image,storageBucket}', ''),
      nullif(a.value_json #>> '{tags,0,image,storageBucket}', ''),
      nullif(a.value_json #>> '{tags,0,image,storage_bucket}', ''),
      sa.storage_bucket,
      case
        when coalesce(
          nullif(a.value_json #>> '{image,storagePath}', ''),
          nullif(a.value_json #>> '{image,storage_path}', ''),
          nullif(a.value_json #>> '{image,path}', ''),
          nullif(a.value_json #>> '{uploadedImage,storagePath}', ''),
          nullif(a.value_json #>> '{uploaded_image,storagePath}', ''),
          nullif(a.value_json #>> '{tags,0,image,storagePath}', ''),
          nullif(a.value_json #>> '{tags,0,image,path}', ''),
          sa.storage_path
        ) is not null then 'survey-assets'
        else null
      end
    ) as image_storage_bucket,
    coalesce(
      nullif(a.value_json #>> '{image,storagePath}', ''),
      nullif(a.value_json #>> '{image,storage_path}', ''),
      nullif(a.value_json #>> '{image,path}', ''),
      nullif(a.value_json #>> '{uploadedImage,storagePath}', ''),
      nullif(a.value_json #>> '{uploaded_image,storagePath}', ''),
      nullif(a.value_json #>> '{tags,0,image,storagePath}', ''),
      nullif(a.value_json #>> '{tags,0,image,path}', ''),
      sa.storage_path
    ) as image_storage_path,
    coalesce(
      nullif(a.value_json #>> '{image,signedUrl}', ''),
      nullif(a.value_json #>> '{image,signed_url}', ''),
      nullif(a.value_json #>> '{image,url}', ''),
      nullif(a.value_json #>> '{uploadedImage,signedUrl}', ''),
      nullif(a.value_json #>> '{uploaded_image,signedUrl}', ''),
      nullif(a.value_json #>> '{tags,0,image,signedUrl}', ''),
      nullif(a.value_json #>> '{tags,0,image,url}', ''),
      nullif(sa.metadata->>'signedUrl', ''),
      nullif(sa.metadata->>'publicUrl', ''),
      nullif(sa.metadata->>'public_url', '')
    ) as image_signed_url,
    private.analysis_filter_value(r, 'dormitory') as dormitory,
    private.analysis_filter_value(r, 'room_type') as room_type,
    private.analysis_filter_value(r, 'rc') as rc,
    private.analysis_filter_value(r, 'department') as department,
    jsonb_strip_nulls(jsonb_build_object(
      'gender', private.analysis_filter_value(r, 'gender'),
      'semesterGroup', private.analysis_filter_value(r, 'semester_group'),
      'department', private.analysis_filter_value(r, 'department'),
      'rc', private.analysis_filter_value(r, 'rc'),
      'dormitory', private.analysis_filter_value(r, 'dormitory'),
      'roomType', private.analysis_filter_value(r, 'room_type'),
      'dormExperience', private.analysis_filter_value(r, 'dorm_experience')
    )) as response_profile,
    a.created_at
  from public.answers a
  join public.responses r on r.id = a.response_id and r.survey_id = a.survey_id
  left join public.questions q on q.id = a.question_id
  left join public.survey_sections s on s.id = a.section_id
  left join public.survey_assets sa on sa.id = a.asset_id
  where a.survey_id = p_survey_id
    and r.status = 'submitted'
    and a.answer_type in ('image_tag', 'participant_image_tag')
    and a.x_ratio between 0 and 1
    and a.y_ratio between 0 and 1
    and private.matches_analysis_profile_filters(r, p_filters)
    and private.matches_analysis_answer_filters(a, p_filters)
  order by a.created_at desc;
$$;

drop function if exists public.get_text_answers(uuid, jsonb);

create or replace function public.get_text_answers(p_survey_id uuid, p_filters jsonb default '{}'::jsonb)
returns table(
  answer_id uuid,
  section_id uuid,
  question_id uuid,
  topic_key text,
  space_key text,
  text_value text,
  value_json jsonb,
  dormitory text,
  room_type text,
  rc text,
  department text,
  profile jsonb,
  created_at timestamptz
)
language sql
stable
set search_path to 'private', 'public'
as $$
  select
    a.id as answer_id,
    a.section_id,
    a.question_id,
    a.topic_key,
    a.space_key,
    a.text_value,
    coalesce(a.value_json, '{}'::jsonb) as value_json,
    private.analysis_filter_value(r, 'dormitory') as dormitory,
    private.analysis_filter_value(r, 'room_type') as room_type,
    private.analysis_filter_value(r, 'rc') as rc,
    private.analysis_filter_value(r, 'department') as department,
    jsonb_strip_nulls(jsonb_build_object(
      'gender', private.analysis_filter_value(r, 'gender'),
      'semesterGroup', private.analysis_filter_value(r, 'semester_group'),
      'department', private.analysis_filter_value(r, 'department'),
      'rc', private.analysis_filter_value(r, 'rc'),
      'dormitory', private.analysis_filter_value(r, 'dormitory'),
      'roomType', private.analysis_filter_value(r, 'room_type'),
      'dormExperience', private.analysis_filter_value(r, 'dorm_experience')
    )) as profile,
    a.created_at
  from public.answers a
  join public.responses r on r.id = a.response_id and r.survey_id = a.survey_id
  where a.survey_id = p_survey_id
    and r.status = 'submitted'
    and a.answer_type = 'text'
    and nullif(a.text_value, '') is not null
    and (nullif(p_filters->>'keyword', '') is null or a.text_value ilike '%' || (p_filters->>'keyword') || '%')
    and private.matches_analysis_profile_filters(r, p_filters)
    and private.matches_analysis_answer_filters(a, p_filters)
  order by a.created_at desc;
$$;

drop function if exists public.get_text_groups(uuid, jsonb);

create or replace function public.get_text_groups(p_survey_id uuid, p_filters jsonb default '{}'::jsonb)
returns table(
  group_key text,
  label text,
  topic_key text,
  issue_type text,
  question_id uuid,
  count bigint,
  n bigint,
  representative_texts text[]
)
language sql
stable
set search_path to 'private', 'public'
as $$
  with answers as (
    select
      a.*,
      coalesce(
        nullif(a.value_json->>'issue_type', ''),
        nullif(a.value_json->>'category', ''),
        nullif(a.value_json->>'choiceValue', ''),
        nullif(a.topic_key, ''),
        nullif(a.space_key, ''),
        a.question_id::text,
        '기타/미분류'
      ) as group_key,
      row_number() over (
        partition by coalesce(
          nullif(a.value_json->>'issue_type', ''),
          nullif(a.value_json->>'category', ''),
          nullif(a.value_json->>'choiceValue', ''),
          nullif(a.topic_key, ''),
          nullif(a.space_key, ''),
          a.question_id::text,
          '기타/미분류'
        )
        order by a.created_at desc
      ) as representative_rank
    from public.answers a
    join public.responses r on r.id = a.response_id and r.survey_id = a.survey_id
    where a.survey_id = p_survey_id
      and r.status = 'submitted'
      and a.answer_type = 'text'
      and nullif(a.text_value, '') is not null
      and (nullif(p_filters->>'keyword', '') is null or a.text_value ilike '%' || (p_filters->>'keyword') || '%')
      and private.matches_analysis_profile_filters(r, p_filters)
      and private.matches_analysis_answer_filters(a, p_filters)
  )
  select
    answers.group_key,
    answers.group_key as label,
    max(answers.topic_key) as topic_key,
    max(answers.value_json->>'issue_type') as issue_type,
    (array_agg(answers.question_id order by answers.created_at desc))[1] as question_id,
    count(*)::bigint as count,
    count(*)::bigint as n,
    array_agg(answers.text_value order by answers.created_at desc) filter (where representative_rank <= 3) as representative_texts
  from answers
  group by answers.group_key
  order by count(*) desc, answers.group_key;
$$;
