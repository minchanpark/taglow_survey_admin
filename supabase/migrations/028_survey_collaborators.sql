create table if not exists public.survey_collaborators (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null references public.surveys(id) on delete cascade,
  email text not null,
  role text not null,
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revoked_at timestamptz null,
  constraint survey_collaborators_role_check check (role in ('editor', 'viewer')),
  constraint survey_collaborators_email_check check (email = lower(btrim(email)) and email ~* '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$')
);

create unique index if not exists idx_survey_collaborators_active_email
on public.survey_collaborators (survey_id, lower(email))
where revoked_at is null;

create index if not exists idx_survey_collaborators_email_active
on public.survey_collaborators (lower(email), survey_id)
where revoked_at is null;

drop trigger if exists set_survey_collaborators_updated_at on public.survey_collaborators;
create trigger set_survey_collaborators_updated_at
before update on public.survey_collaborators
for each row execute function public.set_updated_at();

alter table public.survey_collaborators enable row level security;

grant select, insert, update on public.survey_collaborators to authenticated;

create or replace function private.current_user_email()
returns text
language sql
stable
security definer
set search_path to 'private', 'public'
as $$
  select private.current_auth_email();
$$;

create or replace function private.owns_survey(p_survey_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'private', 'public'
as $$
  select exists (
    select 1
    from public.surveys s
    where s.id = p_survey_id
      and s.created_by = auth.uid()
  );
$$;

create or replace function private.survey_collaborator_role(p_survey_id uuid)
returns text
language sql
stable
security definer
set search_path to 'private', 'public'
as $$
  select sc.role
  from public.survey_collaborators sc
  where sc.survey_id = p_survey_id
    and sc.revoked_at is null
    and lower(sc.email) = private.current_user_email()
  order by sc.created_at desc
  limit 1;
$$;

create or replace function private.can_view_survey(p_survey_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'private', 'public'
as $$
  select private.owns_survey(p_survey_id)
    or private.survey_collaborator_role(p_survey_id) in ('editor', 'viewer');
$$;

create or replace function private.can_edit_survey(p_survey_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'private', 'public'
as $$
  select private.owns_survey(p_survey_id)
    or private.survey_collaborator_role(p_survey_id) = 'editor';
$$;

create or replace function private.can_manage_survey_access(p_survey_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'private', 'public'
as $$
  select private.owns_survey(p_survey_id);
$$;

drop policy if exists "survey owners can manage collaborators" on public.survey_collaborators;
create policy "survey owners can manage collaborators"
on public.survey_collaborators
for all
to authenticated
using (private.can_manage_survey_access(survey_id))
with check (
  private.can_manage_survey_access(survey_id)
  and email = lower(btrim(email))
  and invited_by = auth.uid()
);

drop policy if exists "collaborators can read own collaboration" on public.survey_collaborators;
create policy "collaborators can read own collaboration"
on public.survey_collaborators
for select
to authenticated
using (revoked_at is null and lower(email) = private.current_user_email());

drop policy if exists "authenticated can read accessible surveys" on public.surveys;
create policy "authenticated can read accessible surveys"
on public.surveys
for select
to authenticated
using (status = 'published' or private.can_view_survey(id));

drop policy if exists "authenticated can read accessible sections" on public.survey_sections;
create policy "authenticated can read accessible sections"
on public.survey_sections
for select
to authenticated
using (
  exists (
    select 1
    from public.surveys s
    where s.id = survey_sections.survey_id
      and (s.status = 'published' or private.can_view_survey(s.id))
  )
);

drop policy if exists "authenticated can read accessible questions" on public.questions;
create policy "authenticated can read accessible questions"
on public.questions
for select
to authenticated
using (
  exists (
    select 1
    from public.surveys s
    where s.id = questions.survey_id
      and (s.status = 'published' or private.can_view_survey(s.id))
  )
);

drop policy if exists "authenticated can read accessible assets" on public.survey_assets;
create policy "authenticated can read accessible assets"
on public.survey_assets
for select
to authenticated
using (
  exists (
    select 1
    from public.surveys s
    where s.id = survey_assets.survey_id
      and (s.status = 'published' or private.can_view_survey(s.id))
  )
);

drop policy if exists "authenticated can read accessible responses" on public.responses;
create policy "authenticated can read accessible responses"
on public.responses
for select
to authenticated
using (participant_user_id = auth.uid() or private.can_view_survey(survey_id));

drop policy if exists "authenticated can read accessible answers" on public.answers;
create policy "authenticated can read accessible answers"
on public.answers
for select
to authenticated
using (
  private.can_view_survey(survey_id)
  or exists (
    select 1
    from public.responses r
    where r.id = answers.response_id
      and r.participant_user_id = auth.uid()
  )
);

drop policy if exists "admin survey access stays scoped to creator" on public.surveys;
create policy "admin survey access stays scoped to creator"
on public.surveys
as restrictive
for select
to authenticated
using (status = 'published' or private.can_view_survey(id));

drop policy if exists "admin section access stays scoped to creator" on public.survey_sections;
create policy "admin section access stays scoped to creator"
on public.survey_sections
as restrictive
for select
to authenticated
using (
  exists (
    select 1
    from public.surveys s
    where s.id = survey_sections.survey_id
      and (s.status = 'published' or private.can_view_survey(s.id))
  )
);

drop policy if exists "admin question access stays scoped to creator" on public.questions;
create policy "admin question access stays scoped to creator"
on public.questions
as restrictive
for select
to authenticated
using (
  exists (
    select 1
    from public.surveys s
    where s.id = questions.survey_id
      and (s.status = 'published' or private.can_view_survey(s.id))
  )
);

drop policy if exists "admin asset access stays scoped to creator" on public.survey_assets;
create policy "admin asset access stays scoped to creator"
on public.survey_assets
as restrictive
for select
to authenticated
using (
  exists (
    select 1
    from public.surveys s
    where s.id = survey_assets.survey_id
      and (s.status = 'published' or private.can_view_survey(s.id))
  )
);

drop policy if exists "admin response access stays scoped to creator" on public.responses;
create policy "admin response access stays scoped to creator"
on public.responses
as restrictive
for select
to authenticated
using (participant_user_id = auth.uid() or private.can_view_survey(survey_id));

drop policy if exists "admin answer access stays scoped to creator" on public.answers;
create policy "admin answer access stays scoped to creator"
on public.answers
as restrictive
for select
to authenticated
using (
  private.can_view_survey(survey_id)
  or exists (
    select 1
    from public.responses r
    where r.id = answers.response_id
      and r.participant_user_id = auth.uid()
  )
);

drop policy if exists "admin can manage sections as own survey editor" on public.survey_sections;
drop policy if exists "admin can manage sections as editor" on public.survey_sections;
drop policy if exists "admin can manage sections of own surveys" on public.survey_sections;
drop policy if exists "survey editors can manage sections" on public.survey_sections;
create policy "survey editors can manage sections"
on public.survey_sections
for all
to authenticated
using (private.can_edit_survey(survey_id))
with check (private.can_edit_survey(survey_id));

drop policy if exists "admin can manage questions as own survey editor" on public.questions;
drop policy if exists "admin can manage questions as editor" on public.questions;
drop policy if exists "admin can manage questions of own surveys" on public.questions;
drop policy if exists "survey editors can manage questions" on public.questions;
create policy "survey editors can manage questions"
on public.questions
for all
to authenticated
using (private.can_edit_survey(survey_id))
with check (private.can_edit_survey(survey_id));

drop policy if exists "admin can manage assets as own survey editor" on public.survey_assets;
drop policy if exists "admin can manage assets as editor" on public.survey_assets;
drop policy if exists "admin can manage assets of own surveys" on public.survey_assets;
drop policy if exists "survey editors can manage assets" on public.survey_assets;
create policy "survey editors can manage assets"
on public.survey_assets
for all
to authenticated
using (private.can_edit_survey(survey_id))
with check (private.can_edit_survey(survey_id));

drop policy if exists "admin can manage survey assets objects" on storage.objects;
create policy "admin can manage survey assets objects"
on storage.objects
for all
to authenticated
using (
  bucket_id = 'survey-assets'
  and case
    when name ~ '^surveys/[0-9a-fA-F-]{36}/' then private.can_edit_survey(split_part(name, '/', 2)::uuid)
    else false
  end
  )
with check (
  bucket_id = 'survey-assets'
  and case
    when name ~ '^surveys/[0-9a-fA-F-]{36}/' then private.can_edit_survey(split_part(name, '/', 2)::uuid)
    else false
  end
);

create or replace function public.has_accessible_surveys()
returns boolean
language sql
stable
set search_path to 'public'
as $$
  select exists (
    select 1
    from public.surveys s
    where private.can_view_survey(s.id)
  );
$$;

create or replace function public.list_accessible_surveys()
returns table (
  id uuid,
  title text,
  description text,
  status text,
  public_slug text,
  public_code text,
  version_group_id uuid,
  version_number integer,
  parent_survey_id uuid,
  is_latest_version boolean,
  settings jsonb,
  created_by uuid,
  published_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  access_role text
)
language sql
stable
set search_path to 'public'
as $$
  select
    s.id,
    s.title,
    s.description,
    s.status,
    s.public_slug,
    s.public_code,
    s.version_group_id,
    s.version_number,
    s.parent_survey_id,
    s.is_latest_version,
    s.settings,
    s.created_by,
    s.published_at,
    s.closed_at,
    s.created_at,
    s.updated_at,
    case
      when s.created_by = auth.uid() then 'owner'
      else private.survey_collaborator_role(s.id)
    end as access_role
  from public.surveys s
  where private.can_view_survey(s.id)
  order by s.updated_at desc;
$$;

create or replace function public.get_accessible_survey(p_survey_id uuid)
returns table (
  id uuid,
  title text,
  description text,
  status text,
  public_slug text,
  public_code text,
  version_group_id uuid,
  version_number integer,
  parent_survey_id uuid,
  is_latest_version boolean,
  settings jsonb,
  created_by uuid,
  published_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  access_role text
)
language sql
stable
set search_path to 'public'
as $$
  select *
  from public.list_accessible_surveys() s
  where s.id = p_survey_id
  limit 1;
$$;

grant execute on function public.has_accessible_surveys() to authenticated;
grant execute on function public.list_accessible_surveys() to authenticated;
grant execute on function public.get_accessible_survey(uuid) to authenticated;
