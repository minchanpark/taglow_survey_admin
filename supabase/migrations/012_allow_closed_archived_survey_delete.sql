drop policy if exists "admin can delete own draft surveys" on public.surveys;
drop policy if exists "admin can delete own draft closed archived surveys" on public.surveys;

create policy "admin can delete own draft closed archived surveys"
on public.surveys
for delete
to authenticated
using (
  private.is_admin_editor()
  and created_by = auth.uid()
  and status in ('draft', 'closed', 'archived')
);
