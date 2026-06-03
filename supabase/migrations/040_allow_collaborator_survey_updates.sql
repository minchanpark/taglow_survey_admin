drop policy if exists "active admins can update own surveys" on public.surveys;
drop policy if exists "survey editors can update surveys" on public.surveys;

create policy "survey editors can update surveys"
on public.surveys
for update
to authenticated
using (
  (select private.is_admin_editor())
  and id in (select private.current_editable_survey_ids())
)
with check (
  (select private.is_admin_editor())
  and id in (select private.current_editable_survey_ids())
);

notify pgrst, 'reload schema';
