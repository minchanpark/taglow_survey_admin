alter table public.surveys
add column if not exists starts_at timestamptz,
add column if not exists ends_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'surveys_schedule_window_check'
      and conrelid = 'public.surveys'::regclass
  ) then
    alter table public.surveys
    add constraint surveys_schedule_window_check
    check (starts_at is null or ends_at is null or starts_at < ends_at);
  end if;
end;
$$;

create index if not exists idx_surveys_schedule_status
on public.surveys (status, starts_at, ends_at)
where starts_at is not null or ends_at is not null;

drop function if exists public.get_accessible_survey(uuid);
drop function if exists public.list_accessible_surveys();

create or replace function public.list_accessible_surveys()
returns table (
  id uuid,
  title text,
  description text,
  description_en text,
  status text,
  public_slug text,
  public_code text,
  version_group_id uuid,
  version_number integer,
  parent_survey_id uuid,
  is_latest_version boolean,
  settings jsonb,
  created_by uuid,
  starts_at timestamptz,
  ends_at timestamptz,
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
    s.description_en,
    s.status,
    s.public_slug,
    s.public_code,
    s.version_group_id,
    s.version_number,
    s.parent_survey_id,
    s.is_latest_version,
    s.settings,
    s.created_by,
    s.starts_at,
    s.ends_at,
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
  description_en text,
  status text,
  public_slug text,
  public_code text,
  version_group_id uuid,
  version_number integer,
  parent_survey_id uuid,
  is_latest_version boolean,
  settings jsonb,
  created_by uuid,
  starts_at timestamptz,
  ends_at timestamptz,
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

grant execute on function public.list_accessible_surveys() to authenticated;
grant execute on function public.get_accessible_survey(uuid) to authenticated;

create or replace function private.enforce_survey_update_role_scope()
returns trigger
language plpgsql
security invoker
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
    or old.starts_at is distinct from new.starts_at
    or old.ends_at is distinct from new.ends_at
    or old.published_at is distinct from new.published_at
    or old.closed_at is distinct from new.closed_at
    or old.created_at is distinct from new.created_at then
    raise exception 'Only invitation managers can change survey management fields.'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

create or replace function private.apply_survey_schedule()
returns table (
  opened_count integer,
  closed_count integer
)
language plpgsql
security definer
set search_path to 'private', 'public', 'pg_catalog'
as $$
declare
  v_now timestamptz := now();
  v_opened_count integer := 0;
  v_closed_count integer := 0;
begin
  update public.surveys
  set
    status = case
      when ends_at is not null and ends_at <= v_now then 'closed'
      else 'published'
    end,
    published_at = coalesce(published_at, starts_at, v_now),
    closed_at = case
      when ends_at is not null and ends_at <= v_now then coalesce(closed_at, ends_at, v_now)
      else closed_at
    end,
    updated_at = v_now
  where status = 'draft'
    and starts_at is not null
    and starts_at <= v_now
    and is_latest_version = true;

  get diagnostics v_opened_count = row_count;

  update public.surveys
  set
    status = 'closed',
    closed_at = coalesce(closed_at, ends_at, v_now),
    updated_at = v_now
  where status = 'published'
    and ends_at is not null
    and ends_at <= v_now;

  get diagnostics v_closed_count = row_count;

  return query select v_opened_count, v_closed_count;
end;
$$;

create or replace function private.enforce_response_survey_window()
returns trigger
language plpgsql
security definer
set search_path to 'private', 'public', 'pg_catalog'
as $$
begin
  if new.status = 'submitted'
    and not exists (
      select 1
      from public.surveys s
      where s.id = new.survey_id
        and s.status = 'published'
        and s.is_latest_version = true
        and (s.starts_at is null or s.starts_at <= now())
        and (s.ends_at is null or s.ends_at > now())
    ) then
    raise exception 'Survey is not open for responses.'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_response_survey_window on public.responses;
create trigger enforce_response_survey_window
before insert or update on public.responses
for each row execute function private.enforce_response_survey_window();

create or replace function public.get_participant_survey_access(p_public_identifier text)
returns jsonb
language plpgsql
stable
set search_path to 'public', 'auth'
as $$
declare
  v_public_identifier text := nullif(btrim(p_public_identifier), '');
  v_auth_user_id uuid := auth.uid();
  v_auth_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_survey public.surveys%rowtype;
  v_sections jsonb := '[]'::jsonb;
  v_questions jsonb := '[]'::jsonb;
  v_assets jsonb := '[]'::jsonb;
  v_response_id uuid;
  v_submitted_at timestamptz;
  v_base_result jsonb;
begin
  if v_auth_user_id is null or v_auth_email = '' then
    return jsonb_build_object('status', 'unauthenticated');
  end if;

  select *
  into v_survey
  from public.surveys
  where public_slug = v_public_identifier
     or public_code = v_public_identifier
  limit 1;

  if not found then
    return jsonb_build_object('status', 'survey_not_found');
  end if;

  select coalesce(jsonb_agg(to_jsonb(section_row) order by section_row.order_index), '[]'::jsonb)
  into v_sections
  from public.survey_sections as section_row
  where section_row.survey_id = v_survey.id;

  select coalesce(jsonb_agg(to_jsonb(question_row) order by question_row.order_index), '[]'::jsonb)
  into v_questions
  from public.questions as question_row
  where question_row.survey_id = v_survey.id;

  select coalesce(jsonb_agg(to_jsonb(asset_row) order by asset_row.created_at), '[]'::jsonb)
  into v_assets
  from public.survey_assets as asset_row
  where asset_row.survey_id = v_survey.id;

  v_base_result := jsonb_build_object(
    'survey', to_jsonb(v_survey),
    'sections', v_sections,
    'questions', v_questions,
    'assets', v_assets,
    'session', jsonb_build_object(
      'userId', v_auth_user_id::text,
      'email', v_auth_email
    )
  );

  if v_survey.status <> 'published'
    or (v_survey.starts_at is not null and v_survey.starts_at > now())
    or (v_survey.ends_at is not null and v_survey.ends_at <= now()) then
    return v_base_result || jsonb_build_object('status', 'survey_closed');
  end if;

  select response_row.id, response_row.submitted_at
  into v_response_id, v_submitted_at
  from public.responses as response_row
  where response_row.survey_id = v_survey.id
    and response_row.participant_user_id = v_auth_user_id
    and response_row.status = 'submitted'
  limit 1;

  if v_response_id is not null then
    return v_base_result || jsonb_build_object(
      'status', 'already_submitted',
      'responseId', v_response_id::text,
      'submittedAt', v_submitted_at
    );
  end if;

  return v_base_result || jsonb_build_object('status', 'allowed');
end;
$$;

grant execute on function public.get_participant_survey_access(text) to authenticated;

do $$
begin
  execute 'create extension if not exists pg_cron with schema pg_catalog';
  execute 'grant usage on schema cron to postgres';
  execute 'grant all privileges on all tables in schema cron to postgres';
exception
  when insufficient_privilege or undefined_file then
    raise notice 'pg_cron is unavailable; enable Supabase Cron before relying on automatic survey schedule transitions.';
end;
$$;

do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'cron') then
    execute $cron$
      select cron.unschedule('taglow-apply-survey-schedule')
      where exists (
        select 1
        from cron.job
        where jobname = 'taglow-apply-survey-schedule'
      )
    $cron$;

    execute $cron$
      select cron.schedule(
        'taglow-apply-survey-schedule',
        '* * * * *',
        'select private.apply_survey_schedule();'
      )
    $cron$;
  end if;
end;
$$;

notify pgrst, 'reload schema';
