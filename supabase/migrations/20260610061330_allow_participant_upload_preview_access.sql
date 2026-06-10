create index if not exists idx_analysis_answer_facts_participant_upload_path
on public.analysis_answer_facts (
  (
    coalesce(
      nullif(value_json #>> '{participantImage,storagePath}', ''),
      nullif(value_json #>> '{participantImage,storage_path}', ''),
      nullif(value_json #>> '{participant_image,storagePath}', ''),
      nullif(value_json #>> '{participant_image,storage_path}', ''),
      nullif(value_json #>> '{image,storagePath}', ''),
      nullif(value_json #>> '{image,storage_path}', ''),
      nullif(value_json #>> '{uploadedImage,storagePath}', ''),
      nullif(value_json #>> '{uploadedImage,storage_path}', ''),
      nullif(value_json #>> '{uploaded_image,storagePath}', ''),
      nullif(value_json #>> '{uploaded_image,storage_path}', '')
    )
  )
)
where answer_type = 'participant_image_tag';

create or replace function private.can_view_participant_upload_object(p_storage_path text)
returns boolean
language sql
stable
security definer
set search_path to 'private', 'public'
as $$
  select exists (
    select 1
    from public.analysis_answer_facts a
    where a.answer_type = 'participant_image_tag'
      and coalesce(
        nullif(a.value_json #>> '{participantImage,storagePath}', ''),
        nullif(a.value_json #>> '{participantImage,storage_path}', ''),
        nullif(a.value_json #>> '{participant_image,storagePath}', ''),
        nullif(a.value_json #>> '{participant_image,storage_path}', ''),
        nullif(a.value_json #>> '{image,storagePath}', ''),
        nullif(a.value_json #>> '{image,storage_path}', ''),
        nullif(a.value_json #>> '{uploadedImage,storagePath}', ''),
        nullif(a.value_json #>> '{uploadedImage,storage_path}', ''),
        nullif(a.value_json #>> '{uploaded_image,storagePath}', ''),
        nullif(a.value_json #>> '{uploaded_image,storage_path}', '')
      ) = p_storage_path
      and private.can_view_survey(a.survey_id)
  );
$$;

grant execute on function private.can_view_participant_upload_object(text) to authenticated;

drop policy if exists "survey access can read participant question images" on storage.objects;

create policy "survey access can read participant question images"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'survey-assets'
  and split_part(name, '/', 1) = 'participant-uploads'
  and (
    case
      when name ~ '^participant-uploads/[0-9a-fA-F-]{36}/[^/]+/[0-9a-fA-F-]{36}/' then private.can_view_survey(split_part(name, '/', 2)::uuid)
      else false
    end
    or private.can_view_participant_upload_object(name)
  )
);
