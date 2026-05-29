do $$
declare
  trigger_row record;
begin
  for trigger_row in
    select
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
    execute format('drop trigger if exists %I on public.%I', trigger_row.trigger_name, trigger_row.table_name);
  end loop;
end $$;

drop function if exists public.prevent_published_survey_structure_change();
