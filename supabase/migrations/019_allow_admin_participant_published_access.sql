drop policy if exists "admin survey access stays scoped to creator" on public.surveys;
create policy "admin survey access stays scoped to creator"
on public.surveys
as restrictive
for select
to authenticated
using (
  status = 'published'
  or not private.is_admin_user()
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
      and (s.status = 'published' or s.created_by = auth.uid())
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
      and (s.status = 'published' or s.created_by = auth.uid())
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
      and (s.status = 'published' or s.created_by = auth.uid())
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
  or participant_user_id = auth.uid()
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
  or exists (
    select 1
    from public.responses r
    where r.id = answers.response_id
      and r.participant_user_id = auth.uid()
  )
);
