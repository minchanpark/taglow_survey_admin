create schema if not exists private;

do $$
declare
  constraint_row record;
begin
  for constraint_row in
    select conname
    from pg_constraint
    where conrelid = 'public.admin_members'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%role%'
  loop
    execute format('alter table public.admin_members drop constraint if exists %I', constraint_row.conname);
  end loop;
end $$;

create or replace function private.current_auth_email()
returns text
language sql
stable
security definer
set search_path to 'private', 'public'
as $$
  select lower(coalesce(auth.jwt() ->> 'email', ''));
$$;

create or replace function private.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path to 'private', 'public'
as $$
  select exists (
    select 1
    from public.admin_members am
    where am.user_id = auth.uid()
      and am.role = 'super_admin'
      and lower(am.email) = 'itisnewdawn@gmail.com'
      and am.is_active = true
  );
$$;

create or replace function private.is_admin_user()
returns boolean
language sql
stable
security definer
set search_path to 'private', 'public'
as $$
  select exists (
    select 1
    from public.admin_members am
    where am.user_id = auth.uid()
      and am.role in ('super_admin', 'admin')
      and am.is_active = true
  );
$$;

create or replace function private.is_admin_editor()
returns boolean
language sql
stable
security definer
set search_path to 'private', 'public'
as $$
  select exists (
    select 1
    from public.admin_members am
    where am.user_id = auth.uid()
      and am.role in ('super_admin', 'admin')
      and am.is_active = true
  );
$$;

update public.admin_members
set
  role = case
    when lower(email) = 'itisnewdawn@gmail.com' then 'super_admin'
    when role in ('owner', 'super-admin') then 'admin'
    when role not in ('super_admin', 'admin', 'viewer') then 'admin'
    else role
  end,
  is_active = case
    when lower(email) = 'itisnewdawn@gmail.com' then true
    else is_active
  end,
  updated_at = now()
where role = 'owner'
   or lower(email) = 'itisnewdawn@gmail.com';

with root_user as (
  select id, lower(email) as email
  from auth.users
  where lower(email) = 'itisnewdawn@gmail.com'
  limit 1
),
updated as (
  update public.admin_members am
  set
    user_id = root_user.id,
    email = root_user.email,
    role = 'super_admin',
    is_active = true,
    updated_at = now()
  from root_user
  where am.user_id = root_user.id
     or lower(am.email) = root_user.email
  returning am.id
)
insert into public.admin_members (user_id, email, role, is_active)
select root_user.id, root_user.email, 'super_admin', true
from root_user
where not exists (select 1 from updated);

alter table public.admin_members
add constraint admin_members_role_check
check (role in ('super_admin', 'admin', 'viewer'));

create or replace function public.request_admin_access()
returns public.admin_members
language plpgsql
security definer
set search_path to 'public', 'private'
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text := private.current_auth_email();
  v_member public.admin_members%rowtype;
begin
  if v_user_id is null then
    raise exception 'Login is required to request admin access.';
  end if;

  if v_email = '' then
    raise exception 'Authenticated user email is required to request admin access.';
  end if;

  if v_email = 'itisnewdawn@gmail.com' then
    raise exception 'Super-admin access must be registered directly in Supabase.';
  end if;

  select *
    into v_member
  from public.admin_members
  where user_id = v_user_id
  order by created_at asc
  limit 1;

  if found then
    update public.admin_members
    set
      email = v_email,
      role = 'admin',
      is_active = case when role = 'admin' then is_active else false end,
      updated_at = now()
    where id = v_member.id
    returning * into v_member;
  else
    insert into public.admin_members (user_id, email, role, is_active)
    values (v_user_id, v_email, 'admin', false)
    returning * into v_member;
  end if;

  return v_member;
end;
$$;

create or replace function public.list_pending_admin_members()
returns setof public.admin_members
language plpgsql
stable
security definer
set search_path to 'public', 'private'
as $$
begin
  if not private.is_super_admin() then
    raise exception 'Super-admin membership is required to list admin access requests.';
  end if;

  return query
  select *
  from public.admin_members
  where role = 'admin'
    and is_active = false
  order by created_at asc;
end;
$$;

create or replace function public.approve_admin_member(p_member_id uuid, p_role text default 'admin')
returns public.admin_members
language plpgsql
security definer
set search_path to 'public', 'private'
as $$
declare
  v_role text := coalesce(nullif(p_role, ''), 'admin');
  v_member public.admin_members%rowtype;
begin
  if not private.is_super_admin() then
    raise exception 'Super-admin membership is required to approve admin access requests.';
  end if;

  if v_role <> 'admin' then
    raise exception 'Only admin role can be approved from a request.';
  end if;

  update public.admin_members
  set
    role = 'admin',
    is_active = true,
    updated_at = now()
  where id = p_member_id
    and role = 'admin'
    and lower(email) <> 'itisnewdawn@gmail.com'
  returning * into v_member;

  if not found then
    raise exception 'Admin access request not found.';
  end if;

  return v_member;
end;
$$;

revoke all on function public.request_admin_access() from public;
revoke all on function public.list_pending_admin_members() from public;
revoke all on function public.approve_admin_member(uuid, text) from public;

grant execute on function public.request_admin_access() to authenticated;
grant execute on function public.list_pending_admin_members() to authenticated;
grant execute on function public.approve_admin_member(uuid, text) to authenticated;

alter table public.admin_members enable row level security;

drop policy if exists "admin members can read own row or owner can read all" on public.admin_members;
drop policy if exists "admin members can read own row or super-admin can read all" on public.admin_members;
create policy "admin members can read own row or super-admin can read all"
on public.admin_members
for select
to authenticated
using (user_id = auth.uid() or private.is_super_admin());

drop policy if exists "owner can manage admin members" on public.admin_members;
drop policy if exists "super-admin can manage admin members" on public.admin_members;
create policy "super-admin can manage admin members"
on public.admin_members
for all
to authenticated
using (private.is_super_admin())
with check (
  private.is_super_admin()
  and (
    role <> 'super_admin'
    or (role = 'super_admin' and lower(email) = 'itisnewdawn@gmail.com')
  )
);

drop policy if exists "admin can create surveys" on public.surveys;
create policy "admin can create surveys"
on public.surveys
for insert
to authenticated
with check (private.is_admin_editor() and created_by = auth.uid());

drop policy if exists "admin can update editable surveys" on public.surveys;
drop policy if exists "admin can update own editable surveys" on public.surveys;
create policy "admin can update own editable surveys"
on public.surveys
for update
to authenticated
using (private.is_admin_editor() and created_by = auth.uid())
with check (private.is_admin_editor() and created_by = auth.uid());

drop policy if exists "admin can manage sections as editor" on public.survey_sections;
drop policy if exists "admin can manage sections as own survey editor" on public.survey_sections;
create policy "admin can manage sections as own survey editor"
on public.survey_sections
for all
to authenticated
using (
  private.is_admin_editor()
  and exists (
    select 1
    from public.surveys s
    where s.id = survey_sections.survey_id
      and s.created_by = auth.uid()
  )
)
with check (
  private.is_admin_editor()
  and exists (
    select 1
    from public.surveys s
    where s.id = survey_sections.survey_id
      and s.created_by = auth.uid()
  )
);

drop policy if exists "admin can manage questions as editor" on public.questions;
drop policy if exists "admin can manage questions as own survey editor" on public.questions;
create policy "admin can manage questions as own survey editor"
on public.questions
for all
to authenticated
using (
  private.is_admin_editor()
  and exists (
    select 1
    from public.surveys s
    where s.id = questions.survey_id
      and s.created_by = auth.uid()
  )
)
with check (
  private.is_admin_editor()
  and exists (
    select 1
    from public.surveys s
    where s.id = questions.survey_id
      and s.created_by = auth.uid()
  )
);

drop policy if exists "admin can manage assets as editor" on public.survey_assets;
drop policy if exists "admin can manage assets as own survey editor" on public.survey_assets;
create policy "admin can manage assets as own survey editor"
on public.survey_assets
for all
to authenticated
using (
  private.is_admin_editor()
  and exists (
    select 1
    from public.surveys s
    where s.id = survey_assets.survey_id
      and s.created_by = auth.uid()
  )
)
with check (
  private.is_admin_editor()
  and exists (
    select 1
    from public.surveys s
    where s.id = survey_assets.survey_id
      and s.created_by = auth.uid()
  )
);

drop policy if exists "admin survey access stays scoped to creator" on public.surveys;
create policy "admin survey access stays scoped to creator"
on public.surveys
as restrictive
for select
to authenticated
using (
  not private.is_admin_user()
  or created_by = auth.uid()
);

drop policy if exists "admin section access stays scoped to creator" on public.survey_sections;
create policy "admin section access stays scoped to creator"
on public.survey_sections
as restrictive
for select
to authenticated
using (
  not private.is_admin_user()
  or exists (
    select 1
    from public.surveys s
    where s.id = survey_sections.survey_id
      and s.created_by = auth.uid()
  )
);

drop policy if exists "admin question access stays scoped to creator" on public.questions;
create policy "admin question access stays scoped to creator"
on public.questions
as restrictive
for select
to authenticated
using (
  not private.is_admin_user()
  or exists (
    select 1
    from public.surveys s
    where s.id = questions.survey_id
      and s.created_by = auth.uid()
  )
);

drop policy if exists "admin asset access stays scoped to creator" on public.survey_assets;
create policy "admin asset access stays scoped to creator"
on public.survey_assets
as restrictive
for select
to authenticated
using (
  not private.is_admin_user()
  or exists (
    select 1
    from public.surveys s
    where s.id = survey_assets.survey_id
      and s.created_by = auth.uid()
  )
);

drop policy if exists "admin response access stays scoped to creator" on public.responses;
create policy "admin response access stays scoped to creator"
on public.responses
as restrictive
for select
to authenticated
using (
  not private.is_admin_user()
  or exists (
    select 1
    from public.surveys s
    where s.id = responses.survey_id
      and s.created_by = auth.uid()
  )
);

drop policy if exists "admin answer access stays scoped to creator" on public.answers;
create policy "admin answer access stays scoped to creator"
on public.answers
as restrictive
for select
to authenticated
using (
  not private.is_admin_user()
  or exists (
    select 1
    from public.surveys s
    where s.id = answers.survey_id
      and s.created_by = auth.uid()
  )
);
