create or replace function public.get_participant_login_content(p_public_identifier text)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public', 'pg_catalog'
as $$
declare
  v_public_identifier text := nullif(btrim(p_public_identifier), '');
  v_survey public.surveys%rowtype;
  v_login_settings jsonb;
  v_header_asset_id uuid;
  v_bottom_asset_id uuid;
  v_header_image jsonb := null;
  v_bottom_image jsonb := null;
begin
  if v_public_identifier is null then
    return jsonb_build_object('status', 'survey_not_found');
  end if;

  select *
  into v_survey
  from public.surveys s
  where s.is_latest_version = true
    and s.status = 'published'
    and (s.starts_at is null or s.starts_at <= now())
    and (s.ends_at is null or s.ends_at > now())
    and (
      s.public_slug = v_public_identifier
      or s.public_code = upper(v_public_identifier)
    )
  limit 1;

  if not found then
    return jsonb_build_object('status', 'survey_not_found');
  end if;

  v_login_settings := coalesce(v_survey.settings -> 'participantLogin', '{}'::jsonb);

  begin
    v_header_asset_id := nullif(v_login_settings ->> 'headerImageAssetId', '')::uuid;
  exception
    when invalid_text_representation then
      v_header_asset_id := null;
  end;

  begin
    v_bottom_asset_id := nullif(v_login_settings ->> 'bottomImageAssetId', '')::uuid;
  exception
    when invalid_text_representation then
      v_bottom_asset_id := null;
  end;

  select jsonb_build_object(
    'assetId', asset_row.id::text,
    'storageBucket', asset_row.storage_bucket,
    'storagePath', asset_row.storage_path
  )
  into v_header_image
  from public.survey_assets asset_row
  where asset_row.id = v_header_asset_id
    and asset_row.survey_id = v_survey.id
  limit 1;

  select jsonb_build_object(
    'assetId', asset_row.id::text,
    'storageBucket', asset_row.storage_bucket,
    'storagePath', asset_row.storage_path
  )
  into v_bottom_image
  from public.survey_assets asset_row
  where asset_row.id = v_bottom_asset_id
    and asset_row.survey_id = v_survey.id
  limit 1;

  return jsonb_build_object(
    'status', 'allowed',
    'title', v_survey.title,
    'headline', nullif(btrim(v_login_settings ->> 'headline'), ''),
    'headlineEn', nullif(btrim(v_login_settings ->> 'headlineEn'), ''),
    'bodyParagraphs', coalesce(v_login_settings -> 'bodyParagraphs', '[]'::jsonb),
    'bodyParagraphsEn', coalesce(v_login_settings -> 'bodyParagraphsEn', '[]'::jsonb),
    'headerImage', v_header_image,
    'bottomImage', v_bottom_image
  );
end;
$$;

grant execute on function public.get_participant_login_content(text) to anon, authenticated;

drop policy if exists "public can read participant login asset objects" on storage.objects;
create policy "public can read participant login asset objects"
on storage.objects
for select
to anon, authenticated
using (
  bucket_id = 'survey-assets'
  and name ~ '^surveys/[0-9a-fA-F-]{36}/images/'
  and exists (
    select 1
    from public.survey_assets asset_row
    join public.surveys survey_row on survey_row.id = asset_row.survey_id
    where asset_row.storage_bucket = bucket_id
      and asset_row.storage_path = name
      and asset_row.asset_type = 'image'
      and coalesce(asset_row.metadata ->> 'usage', '') in ('participant_login_header', 'participant_login_bottom')
      and survey_row.is_latest_version = true
      and survey_row.status = 'published'
      and (survey_row.starts_at is null or survey_row.starts_at <= now())
      and (survey_row.ends_at is null or survey_row.ends_at > now())
      and (
        survey_row.settings #>> '{participantLogin,headerImageAssetId}' = asset_row.id::text
        or survey_row.settings #>> '{participantLogin,bottomImageAssetId}' = asset_row.id::text
      )
  )
);

notify pgrst, 'reload schema';
