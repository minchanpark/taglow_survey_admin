do $$
declare
  trigger_row record;
  function_row record;
begin
  for trigger_row in
    select
      n.nspname as schema_name,
      c.relname as table_name,
      t.tgname as trigger_name
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    join pg_proc p on p.oid = t.tgfoid
    where n.nspname = 'public'
      and c.relname in ('survey_sections', 'questions', 'survey_assets')
      and p.proname = 'prevent_published_survey_structure_change'
      and not t.tgisinternal
  loop
    execute format('drop trigger if exists %I on %I.%I', trigger_row.trigger_name, trigger_row.schema_name, trigger_row.table_name);
  end loop;

  for function_row in
    select
      n.nspname as schema_name,
      p.proname as function_name,
      pg_get_function_identity_arguments(p.oid) as arguments
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where p.proname = 'prevent_published_survey_structure_change'
      and n.nspname in ('public', 'private')
  loop
    execute format('drop function if exists %I.%I(%s) cascade', function_row.schema_name, function_row.function_name, function_row.arguments);
  end loop;
end $$;

drop policy if exists "admin can update own surveys" on public.surveys;
drop policy if exists "admin can update editable surveys" on public.surveys;
create policy "admin can update editable surveys"
on public.surveys
for update
to authenticated
using (private.is_admin_editor())
with check (private.is_admin_editor());

drop policy if exists "admin can manage sections of own surveys" on public.survey_sections;
drop policy if exists "admin can manage sections as editor" on public.survey_sections;
create policy "admin can manage sections as editor"
on public.survey_sections
for all
to authenticated
using (private.is_admin_editor())
with check (private.is_admin_editor());

drop policy if exists "admin can manage questions of own surveys" on public.questions;
drop policy if exists "admin can manage questions as editor" on public.questions;
create policy "admin can manage questions as editor"
on public.questions
for all
to authenticated
using (private.is_admin_editor())
with check (private.is_admin_editor());

drop policy if exists "admin can manage assets of own surveys" on public.survey_assets;
drop policy if exists "admin can manage assets as editor" on public.survey_assets;
create policy "admin can manage assets as editor"
on public.survey_assets
for all
to authenticated
using (private.is_admin_editor())
with check (private.is_admin_editor());
