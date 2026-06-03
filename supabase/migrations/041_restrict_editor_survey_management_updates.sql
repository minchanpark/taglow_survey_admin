create or replace function private.enforce_survey_update_role_scope()
returns trigger
language plpgsql
security definer
set search_path to 'private', 'public'
as $$
begin
  if current_user in ('postgres', 'supabase_admin') or coalesce(auth.role(), '') = 'service_role' then
    return new;
  end if;

  if old.id in (select private.current_manageable_survey_ids()) then
    return new;
  end if;

  if old.status is distinct from new.status
    or old.public_slug is distinct from new.public_slug
    or old.public_code is distinct from new.public_code
    or old.version_group_id is distinct from new.version_group_id
    or old.version_number is distinct from new.version_number
    or old.parent_survey_id is distinct from new.parent_survey_id
    or old.is_latest_version is distinct from new.is_latest_version
    or old.settings is distinct from new.settings
    or old.created_by is distinct from new.created_by
    or old.published_at is distinct from new.published_at
    or old.closed_at is distinct from new.closed_at
    or old.created_at is distinct from new.created_at then
    raise exception 'Only invitation managers can change survey management fields.'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_survey_update_role_scope on public.surveys;
create trigger enforce_survey_update_role_scope
before update on public.surveys
for each row execute function private.enforce_survey_update_role_scope();

grant execute on function private.enforce_survey_update_role_scope() to authenticated;

notify pgrst, 'reload schema';
