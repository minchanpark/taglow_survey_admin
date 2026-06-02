drop policy if exists "survey access can read survey asset objects" on storage.objects;
create policy "survey access can read survey asset objects"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'survey-assets'
  and case
    when name ~ '^surveys/[0-9a-fA-F-]{36}/' then private.can_view_survey(split_part(name, '/', 2)::uuid)
    else false
  end
);

drop policy if exists "survey access can read participant question images" on storage.objects;
create policy "survey access can read participant question images"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'survey-assets'
  and case
    when name ~ '^participant-uploads/[0-9a-fA-F-]{36}/[^/]+/[0-9a-fA-F-]{36}/' then private.can_view_survey(split_part(name, '/', 2)::uuid)
    else false
  end
);

drop function if exists public.get_image_tag_answers(uuid, jsonb);

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
        nullif(a.value_json #>> '{tags,0,image,signedUrl}', ''),
        nullif(a.value_json #>> '{tags,0,image,signed_url}', '')
      ) as resolved_signed_url,
      row_number() over (order by a.created_at desc, a.answer_id desc) as rn
    from public.analysis_answer_facts a
    left join public.survey_assets sa on sa.id = a.asset_id and sa.survey_id = a.survey_id
    cross join params p
    where a.survey_id = p_survey_id
      and a.passed_attention_check = true
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

grant execute on function public.get_image_tag_answers(uuid, jsonb) to authenticated;

notify pgrst, 'reload schema';
