create or replace function public.generate_survey_public_code()
returns text
language plpgsql
set search_path to 'public'
as $$
declare
  v_candidate text;
begin
  loop
    v_candidate := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
    exit when not exists (
      select 1
      from public.surveys
      where public_code = v_candidate
    );
  end loop;

  return v_candidate;
end;
$$;

alter table public.surveys
add column if not exists public_code text;

update public.surveys
set public_code = public.generate_survey_public_code()
where public_code is null
   or btrim(public_code) = '';

alter table public.surveys
alter column public_code set default public.generate_survey_public_code();

alter table public.surveys
alter column public_code set not null;

alter table public.surveys
drop constraint if exists surveys_public_code_format_check;

alter table public.surveys
add constraint surveys_public_code_format_check
check (public_code ~ '^[A-Z0-9]{6,12}$');

create unique index if not exists idx_surveys_public_code
on public.surveys (public_code);

create unique index if not exists idx_surveys_public_slug_unique
on public.surveys (public_slug)
where public_slug is not null;

create index if not exists idx_surveys_public_identifier_published
on public.surveys (status, is_latest_version, public_slug, public_code)
where status = 'published';
