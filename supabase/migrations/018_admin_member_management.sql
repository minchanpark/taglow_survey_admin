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
      and am.is_active = true
  );
$$;

create or replace function public.list_active_admin_members()
returns setof public.admin_members
language plpgsql
stable
security definer
set search_path to 'public', 'private'
as $$
begin
  if not private.is_super_admin() then
    raise exception 'Super-admin membership is required to list active admin members.';
  end if;

  return query
  select *
  from public.admin_members
  where role in ('super_admin', 'admin')
    and is_active = true
  order by
    case when role = 'super_admin' then 0 else 1 end,
    created_at asc;
end;
$$;

create or replace function public.update_admin_member_role(p_member_id uuid, p_role text)
returns public.admin_members
language plpgsql
security definer
set search_path to 'public', 'private'
as $$
declare
  v_role text := coalesce(nullif(p_role, ''), 'super_admin');
  v_member public.admin_members%rowtype;
begin
  if not private.is_super_admin() then
    raise exception 'Super-admin membership is required to update admin member roles.';
  end if;

  if v_role <> 'super_admin' then
    raise exception 'Only super_admin upgrades are supported.';
  end if;

  update public.admin_members
  set
    role = 'super_admin',
    is_active = true,
    updated_at = now()
  where id = p_member_id
    and role = 'admin'
    and is_active = true
    and user_id <> auth.uid()
  returning * into v_member;

  if not found then
    raise exception 'Active admin member not found or cannot be upgraded.';
  end if;

  return v_member;
end;
$$;

create or replace function public.delete_admin_member(p_member_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public', 'private'
as $$
declare
  v_member public.admin_members%rowtype;
begin
  if not private.is_super_admin() then
    raise exception 'Super-admin membership is required to delete admin member permissions.';
  end if;

  select *
    into v_member
  from public.admin_members
  where id = p_member_id
    and is_active = true;

  if not found then
    raise exception 'Active admin member not found.';
  end if;

  if v_member.user_id = auth.uid() then
    raise exception 'Cannot delete your own admin permission.';
  end if;

  if v_member.role = 'super_admin' and lower(v_member.email) = 'itisnewdawn@gmail.com' then
    raise exception 'Cannot delete the system super-admin permission.';
  end if;

  delete from public.admin_members
  where id = v_member.id;
end;
$$;

revoke all on function public.list_active_admin_members() from public;
revoke all on function public.update_admin_member_role(uuid, text) from public;
revoke all on function public.delete_admin_member(uuid) from public;

grant execute on function public.list_active_admin_members() to authenticated;
grant execute on function public.update_admin_member_role(uuid, text) to authenticated;
grant execute on function public.delete_admin_member(uuid) to authenticated;

drop policy if exists "super-admin can manage admin members" on public.admin_members;
drop policy if exists "super-admin can update admin members" on public.admin_members;
create policy "super-admin can update admin members"
on public.admin_members
for update
to authenticated
using (
  private.is_super_admin()
  and user_id <> auth.uid()
  and lower(email) <> 'itisnewdawn@gmail.com'
)
with check (
  private.is_super_admin()
  and role in ('super_admin', 'admin', 'viewer')
  and user_id <> auth.uid()
  and lower(email) <> 'itisnewdawn@gmail.com'
);

drop policy if exists "super-admin can delete admin members" on public.admin_members;
create policy "super-admin can delete admin members"
on public.admin_members
for delete
to authenticated
using (
  private.is_super_admin()
  and user_id <> auth.uid()
  and lower(email) <> 'itisnewdawn@gmail.com'
);
