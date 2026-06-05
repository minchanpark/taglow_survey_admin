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
  -- starts_at only: publish draft surveys automatically; closing remains manual.
  -- ends_at only: close already-published surveys automatically; publishing remains manual.
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

comment on function private.apply_survey_schedule()
is 'Applies scheduled survey publish and close windows. Expected to run from Supabase Cron every minute.';

do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'cron')
    and to_regprocedure('cron.schedule(text,text,text)') is not null
    and to_regprocedure('cron.unschedule(text)') is not null then
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
  else
    raise notice 'Supabase Cron is not enabled; enable Cron/pg_cron in the Supabase dashboard, then rerun this migration or create the taglow-apply-survey-schedule job manually.';
  end if;
end;
$$;
