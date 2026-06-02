alter table public.survey_collaborators
drop constraint if exists survey_collaborators_role_check;

alter table public.survey_collaborators
add constraint survey_collaborators_role_check
check (role in ('manager', 'editor', 'viewer'));

create or replace function private.current_editable_survey_ids()
returns setof uuid
language sql
stable
security definer
set search_path to 'private', 'public'
as $$
  select s.id
  from public.surveys s
  where s.created_by = (select auth.uid())
  union
  select sc.survey_id
  from public.survey_collaborators sc
  where sc.revoked_at is null
    and sc.role in ('manager', 'editor')
    and lower(sc.email) = private.current_auth_email();
$$;

create or replace function private.current_manageable_survey_ids()
returns setof uuid
language sql
stable
security definer
set search_path to 'private', 'public'
as $$
  select s.id
  from public.surveys s
  where s.created_by = (select auth.uid())
  union
  select sc.survey_id
  from public.survey_collaborators sc
  where sc.revoked_at is null
    and sc.role = 'manager'
    and lower(sc.email) = private.current_auth_email();
$$;

create or replace function private.can_view_survey(p_survey_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'private', 'public'
as $$
  select p_survey_id in (select private.current_accessible_survey_ids());
$$;

create or replace function private.can_edit_survey(p_survey_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'private', 'public'
as $$
  select p_survey_id in (select private.current_editable_survey_ids());
$$;

create or replace function private.can_manage_survey_access(p_survey_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'private', 'public'
as $$
  select p_survey_id in (select private.current_manageable_survey_ids());
$$;

grant execute on function private.current_editable_survey_ids() to authenticated;
grant execute on function private.current_manageable_survey_ids() to authenticated;
grant execute on function private.can_view_survey(uuid) to authenticated;
grant execute on function private.can_edit_survey(uuid) to authenticated;
grant execute on function private.can_manage_survey_access(uuid) to authenticated;

drop policy if exists "survey collaborators can be read by owner or invited email" on public.survey_collaborators;
drop policy if exists "survey collaborators can be read by manager or invited email" on public.survey_collaborators;
drop policy if exists "survey owners can insert collaborators" on public.survey_collaborators;
drop policy if exists "survey managers can insert collaborators" on public.survey_collaborators;
drop policy if exists "survey owners can update collaborators" on public.survey_collaborators;
drop policy if exists "survey managers can update collaborators" on public.survey_collaborators;
drop policy if exists "survey owners can delete collaborators" on public.survey_collaborators;
drop policy if exists "survey managers can delete collaborators" on public.survey_collaborators;

create policy "survey collaborators can be read by manager or invited email"
on public.survey_collaborators
for select
to authenticated
using (
  survey_id in (select private.current_manageable_survey_ids())
  or (revoked_at is null and lower(email) = (select private.current_auth_email()))
);

create policy "survey managers can insert collaborators"
on public.survey_collaborators
for insert
to authenticated
with check (
  survey_id in (select private.current_manageable_survey_ids())
  and email = lower(btrim(email))
  and invited_by = (select auth.uid())
);

create policy "survey managers can update collaborators"
on public.survey_collaborators
for update
to authenticated
using (survey_id in (select private.current_manageable_survey_ids()))
with check (survey_id in (select private.current_manageable_survey_ids()) and email = lower(btrim(email)));

create policy "survey managers can delete collaborators"
on public.survey_collaborators
for delete
to authenticated
using (survey_id in (select private.current_manageable_survey_ids()));

notify pgrst, 'reload schema';
