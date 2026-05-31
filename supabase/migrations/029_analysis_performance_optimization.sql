create or replace function private.current_auth_email()
returns text
language sql
stable
security definer
set search_path to 'private', 'public'
as $$
  select lower(coalesce((select auth.jwt()) ->> 'email', ''));
$$;

create or replace function private.is_admin_user()
returns boolean
language sql
stable
security definer
set search_path to 'private', 'public'
as $$
  select exists (
    select 1
    from public.admin_members am
    where am.user_id = (select auth.uid())
      and am.role in ('super_admin', 'admin')
      and am.is_active = true
  );
$$;

create or replace function private.is_admin_editor()
returns boolean
language sql
stable
security definer
set search_path to 'private', 'public'
as $$
  select private.is_admin_user();
$$;

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
    where am.user_id = (select auth.uid())
      and am.role = 'super_admin'
      and am.is_active = true
  );
$$;

create or replace function private.current_owned_survey_ids()
returns setof uuid
language sql
stable
security definer
set search_path to 'private', 'public'
as $$
  select s.id
  from public.surveys s
  where s.created_by = (select auth.uid());
$$;

create or replace function private.current_accessible_survey_ids()
returns setof uuid
language sql
stable
security definer
set search_path to 'private', 'public'
as $$
  select s.id
  from public.surveys s
  where s.created_by = (select auth.uid())
  union
  select sc.survey_id
  from public.survey_collaborators sc
  where sc.revoked_at is null
    and lower(sc.email) = private.current_auth_email();
$$;

create or replace function private.current_editable_survey_ids()
returns setof uuid
language sql
stable
security definer
set search_path to 'private', 'public'
as $$
  select s.id
  from public.surveys s
  where s.created_by = (select auth.uid())
  union
  select sc.survey_id
  from public.survey_collaborators sc
  where sc.revoked_at is null
    and sc.role = 'editor'
    and lower(sc.email) = private.current_auth_email();
$$;

create or replace function private.current_participant_response_ids()
returns setof uuid
language sql
stable
security definer
set search_path to 'private', 'public'
as $$
  select r.id
  from public.responses r
  where r.participant_user_id = (select auth.uid());
$$;

create or replace function private.can_insert_answer_for_response(p_response_id uuid, p_survey_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'private', 'public'
as $$
  select exists (
    select 1
    from public.responses r
    where r.id = p_response_id
      and r.survey_id = p_survey_id
      and r.participant_user_id = (select auth.uid())
  );
$$;

create or replace function private.owns_survey(p_survey_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'private', 'public'
as $$
  select p_survey_id in (select private.current_owned_survey_ids());
$$;

create or replace function private.can_view_survey(p_survey_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'private', 'public'
as $$
  select p_survey_id in (select private.current_accessible_survey_ids());
$$;

create or replace function private.can_edit_survey(p_survey_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'private', 'public'
as $$
  select p_survey_id in (select private.current_editable_survey_ids());
$$;

create or replace function private.can_manage_survey_access(p_survey_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'private', 'public'
as $$
  select p_survey_id in (select private.current_owned_survey_ids());
$$;

alter function private.analysis_profile_answer_value(uuid, uuid, text) security definer;
alter function private.analysis_filter_value(public.responses, text) security definer;
alter function private.analysis_profile_options(uuid, text) security definer;
alter function private.matches_analysis_profile_filters(public.responses, jsonb) security definer;
alter function private.matches_analysis_answer_filters(public.answers, jsonb) security definer;
alter function private.passes_analysis_attention_checks(public.responses) security definer;

grant execute on function private.current_auth_email() to authenticated;
grant execute on function private.is_admin_user() to authenticated;
grant execute on function private.is_admin_editor() to authenticated;
grant execute on function private.is_super_admin() to authenticated;
grant execute on function private.current_owned_survey_ids() to authenticated;
grant execute on function private.current_accessible_survey_ids() to authenticated;
grant execute on function private.current_editable_survey_ids() to authenticated;
grant execute on function private.current_participant_response_ids() to authenticated;
grant execute on function private.can_insert_answer_for_response(uuid, uuid) to authenticated;
grant execute on function private.owns_survey(uuid) to authenticated;
grant execute on function private.can_view_survey(uuid) to authenticated;
grant execute on function private.can_edit_survey(uuid) to authenticated;
grant execute on function private.can_manage_survey_access(uuid) to authenticated;

revoke execute on function public.request_admin_access() from anon;
revoke execute on function public.list_pending_admin_members() from anon;
revoke execute on function public.list_active_admin_members() from anon;
revoke execute on function public.approve_admin_member(uuid, text) from anon;
revoke execute on function public.update_admin_member_role(uuid, text) from anon;
revoke execute on function public.delete_admin_member(uuid) from anon;

grant execute on function public.request_admin_access() to authenticated;
grant execute on function public.list_pending_admin_members() to authenticated;
grant execute on function public.list_active_admin_members() to authenticated;
grant execute on function public.approve_admin_member(uuid, text) to authenticated;
grant execute on function public.update_admin_member_role(uuid, text) to authenticated;
grant execute on function public.delete_admin_member(uuid) to authenticated;

drop policy if exists "admin can view own membership" on public.admin_members;
drop policy if exists "admin members can read own row or super-admin can read all" on public.admin_members;
drop policy if exists "super-admin can update admin members" on public.admin_members;
drop policy if exists "super-admin can delete admin members" on public.admin_members;

create policy "admin members can read own row or super admin can read all"
on public.admin_members
for select
to authenticated
using (user_id = (select auth.uid()) or (select private.is_super_admin()));

create policy "super admin can update admin members"
on public.admin_members
for update
to authenticated
using ((select private.is_super_admin()) and user_id <> (select auth.uid()) and lower(email) <> 'itisnewdawn@gmail.com')
with check (
  (select private.is_super_admin())
  and role in ('super_admin', 'admin', 'viewer')
  and user_id <> (select auth.uid())
  and lower(email) <> 'itisnewdawn@gmail.com'
);

create policy "super admin can delete admin members"
on public.admin_members
for delete
to authenticated
using ((select private.is_super_admin()) and user_id <> (select auth.uid()) and lower(email) <> 'itisnewdawn@gmail.com');

drop policy if exists "admin can read surveys" on public.surveys;
drop policy if exists "authenticated can read accessible surveys" on public.surveys;
drop policy if exists "authenticated users can read published surveys" on public.surveys;
drop policy if exists "admin survey access stays scoped to creator" on public.surveys;
drop policy if exists "admin can create surveys" on public.surveys;
drop policy if exists "admin can update own editable surveys" on public.surveys;
drop policy if exists "admin can delete own draft closed archived surveys" on public.surveys;

create policy "surveys can be read when published owned or shared"
on public.surveys
for select
to authenticated
using (
  status = 'published'
  or created_by = (select auth.uid())
  or id in (select private.current_accessible_survey_ids())
);

create policy "active admins can create own surveys"
on public.surveys
for insert
to authenticated
with check ((select private.is_admin_editor()) and created_by = (select auth.uid()));

create policy "active admins can update own surveys"
on public.surveys
for update
to authenticated
using ((select private.is_admin_editor()) and created_by = (select auth.uid()))
with check ((select private.is_admin_editor()) and created_by = (select auth.uid()));

create policy "active admins can delete own draft closed archived surveys"
on public.surveys
for delete
to authenticated
using (
  (select private.is_admin_editor())
  and created_by = (select auth.uid())
  and status in ('draft', 'closed', 'archived')
);

drop policy if exists "authenticated can read accessible sections" on public.survey_sections;
drop policy if exists "authenticated users can read sections of published surveys" on public.survey_sections;
drop policy if exists "admin section access stays scoped to creator" on public.survey_sections;
drop policy if exists "survey editors can manage sections" on public.survey_sections;

create policy "survey sections can be read when survey is published owned or shared"
on public.survey_sections
for select
to authenticated
using (
  exists (
    select 1
    from public.surveys s
    where s.id = survey_sections.survey_id
      and (s.status = 'published' or s.id in (select private.current_accessible_survey_ids()))
  )
);

create policy "survey editors can insert sections"
on public.survey_sections
for insert
to authenticated
with check (survey_id in (select private.current_editable_survey_ids()));

create policy "survey editors can update sections"
on public.survey_sections
for update
to authenticated
using (survey_id in (select private.current_editable_survey_ids()))
with check (survey_id in (select private.current_editable_survey_ids()));

create policy "survey editors can delete sections"
on public.survey_sections
for delete
to authenticated
using (survey_id in (select private.current_editable_survey_ids()));

drop policy if exists "authenticated can read accessible questions" on public.questions;
drop policy if exists "authenticated users can read questions of published surveys" on public.questions;
drop policy if exists "admin question access stays scoped to creator" on public.questions;
drop policy if exists "survey editors can manage questions" on public.questions;

create policy "questions can be read when survey is published owned or shared"
on public.questions
for select
to authenticated
using (
  exists (
    select 1
    from public.surveys s
    where s.id = questions.survey_id
      and (s.status = 'published' or s.id in (select private.current_accessible_survey_ids()))
  )
);

create policy "survey editors can insert questions"
on public.questions
for insert
to authenticated
with check (survey_id in (select private.current_editable_survey_ids()));

create policy "survey editors can update questions"
on public.questions
for update
to authenticated
using (survey_id in (select private.current_editable_survey_ids()))
with check (survey_id in (select private.current_editable_survey_ids()));

create policy "survey editors can delete questions"
on public.questions
for delete
to authenticated
using (survey_id in (select private.current_editable_survey_ids()));

drop policy if exists "authenticated can read accessible assets" on public.survey_assets;
drop policy if exists "authenticated users can read assets of published surveys" on public.survey_assets;
drop policy if exists "admin asset access stays scoped to creator" on public.survey_assets;
drop policy if exists "survey editors can manage assets" on public.survey_assets;

create policy "survey assets can be read when survey is published owned or shared"
on public.survey_assets
for select
to authenticated
using (
  exists (
    select 1
    from public.surveys s
    where s.id = survey_assets.survey_id
      and (s.status = 'published' or s.id in (select private.current_accessible_survey_ids()))
  )
);

create policy "survey editors can insert assets"
on public.survey_assets
for insert
to authenticated
with check (survey_id in (select private.current_editable_survey_ids()));

create policy "survey editors can update assets"
on public.survey_assets
for update
to authenticated
using (survey_id in (select private.current_editable_survey_ids()))
with check (survey_id in (select private.current_editable_survey_ids()));

create policy "survey editors can delete assets"
on public.survey_assets
for delete
to authenticated
using (survey_id in (select private.current_editable_survey_ids()));

drop policy if exists "admin can read responses of own surveys" on public.responses;
drop policy if exists "authenticated can read accessible responses" on public.responses;
drop policy if exists "participant can read own response" on public.responses;
drop policy if exists "admin response access stays scoped to creator" on public.responses;
drop policy if exists "participant can create own response" on public.responses;

create policy "responses can be read by participant owner or survey access"
on public.responses
for select
to authenticated
using (participant_user_id = (select auth.uid()) or survey_id in (select private.current_accessible_survey_ids()));

create policy "participants can create own response"
on public.responses
for insert
to authenticated
with check (participant_user_id = (select auth.uid()) and lower(participant_email) = (select private.current_auth_email()));

drop policy if exists "admin can read answers of own surveys" on public.answers;
drop policy if exists "authenticated can read accessible answers" on public.answers;
drop policy if exists "participant can read own answers" on public.answers;
drop policy if exists "admin answer access stays scoped to creator" on public.answers;
drop policy if exists "participant can create answers for own response" on public.answers;

create policy "answers can be read by participant owner or survey access"
on public.answers
for select
to authenticated
using (
  survey_id in (select private.current_accessible_survey_ids())
  or response_id in (select private.current_participant_response_ids())
);

create policy "participants can create answers for own response"
on public.answers
for insert
to authenticated
with check ((select private.can_insert_answer_for_response(response_id, survey_id)));

drop policy if exists "survey owners can manage collaborators" on public.survey_collaborators;
drop policy if exists "collaborators can read own collaboration" on public.survey_collaborators;

create policy "survey collaborators can be read by owner or invited email"
on public.survey_collaborators
for select
to authenticated
using (
  survey_id in (select private.current_owned_survey_ids())
  or (revoked_at is null and lower(email) = (select private.current_auth_email()))
);

create policy "survey owners can insert collaborators"
on public.survey_collaborators
for insert
to authenticated
with check (
  survey_id in (select private.current_owned_survey_ids())
  and email = lower(btrim(email))
  and invited_by = (select auth.uid())
);

create policy "survey owners can update collaborators"
on public.survey_collaborators
for update
to authenticated
using (survey_id in (select private.current_owned_survey_ids()))
with check (survey_id in (select private.current_owned_survey_ids()) and email = lower(btrim(email)));

create policy "survey owners can delete collaborators"
on public.survey_collaborators
for delete
to authenticated
using (survey_id in (select private.current_owned_survey_ids()));

create index if not exists idx_answers_asset_id
on public.answers (asset_id)
where asset_id is not null;

create index if not exists idx_answers_question_id
on public.answers (question_id)
where question_id is not null;

create index if not exists idx_answers_section_id
on public.answers (section_id)
where section_id is not null;

create index if not exists idx_answers_response_survey
on public.answers (response_id, survey_id);

create index if not exists idx_questions_section_id
on public.questions (section_id);

create index if not exists idx_questions_section_survey
on public.questions (section_id, survey_id);

create index if not exists idx_survey_assets_section_id
on public.survey_assets (section_id)
where section_id is not null;

create index if not exists idx_survey_assets_question_id
on public.survey_assets (question_id)
where question_id is not null;

create index if not exists idx_survey_collaborators_invited_by
on public.survey_collaborators (invited_by)
where invited_by is not null;

create index if not exists idx_surveys_parent_survey_id
on public.surveys (parent_survey_id)
where parent_survey_id is not null;

create index if not exists idx_analysis_responses_submitted_profile_filters
on public.responses (survey_id, gender, semester_group, department, rc, dormitory, room_type, dorm_experience)
where status = 'submitted';

create index if not exists idx_analysis_answers_scale_response_topic
on public.answers (survey_id, metric_type, response_id, topic_key, section_id, question_id)
where answer_type = 'scale';

create index if not exists idx_analysis_answers_choice_response
on public.answers (survey_id, answer_type, question_id, choice_value, response_id)
where answer_type in ('single_choice', 'multi_select', 'ranking', 'profile', 'experience');

create index if not exists idx_analysis_answers_text_response
on public.answers (survey_id, response_id, topic_key, space_key, question_id, created_at desc)
where answer_type = 'text' and text_value is not null;

create index if not exists idx_analysis_answers_image_tag_response
on public.answers (survey_id, asset_id, tag_type, response_id, created_at desc)
where answer_type in ('image_tag', 'participant_image_tag');

create index if not exists idx_analysis_answers_attention_response
on public.answers (survey_id, response_id, question_id)
where answer_type = 'attention_check';

create or replace function public.get_response_summary(p_survey_id uuid, p_filters jsonb default '{}'::jsonb)
returns table (
  total_responses bigint,
  submitted_responses bigint,
  filtered_responses bigint,
  low_sample_threshold integer,
  is_low_sample boolean,
  profile_distribution jsonb,
  low_sample_groups jsonb
)
language sql
stable
set search_path to 'private', 'public'
as $$
  with threshold as (
    select 10::integer as value
  ),
  dimensions(payload_key, output_key, order_index) as (
    values
      ('gender', 'gender', 1),
      ('semester_group', 'semesterGroup', 2),
      ('department', 'department', 3),
      ('rc', 'rc', 4),
      ('dormitory', 'dormitory', 5),
      ('room_type', 'roomType', 6),
      ('dorm_experience', 'dormExperience', 7)
  ),
  valid_responses as (
    select
      private.analysis_filter_value(r, 'gender') as gender,
      private.analysis_filter_value(r, 'semester_group') as semester_group,
      private.analysis_filter_value(r, 'department') as department,
      private.analysis_filter_value(r, 'rc') as rc,
      private.analysis_filter_value(r, 'dormitory') as dormitory,
      private.analysis_filter_value(r, 'room_type') as room_type,
      private.analysis_filter_value(r, 'dorm_experience') as dorm_experience
    from public.responses r
    where r.survey_id = p_survey_id
      and r.status = 'submitted'
      and private.passes_analysis_attention_checks(r)
  ),
  filtered_responses as (
    select *
    from valid_responses
    where (nullif(p_filters->>'gender', '') is null or gender = p_filters->>'gender')
      and (nullif(p_filters->>'semester_group', '') is null or semester_group = p_filters->>'semester_group')
      and (nullif(p_filters->>'department', '') is null or department = p_filters->>'department')
      and (nullif(p_filters->>'rc', '') is null or rc = p_filters->>'rc')
      and (nullif(p_filters->>'dormitory', '') is null or dormitory = p_filters->>'dormitory')
      and (nullif(p_filters->>'room_type', '') is null or room_type = p_filters->>'room_type')
      and (nullif(p_filters->>'dorm_experience', '') is null or dorm_experience = p_filters->>'dorm_experience')
  ),
  counts as (
    select
      (select count(*) from valid_responses)::bigint as total_responses,
      (select count(*) from valid_responses)::bigint as submitted_responses,
      (select count(*) from filtered_responses)::bigint as filtered_responses
  ),
  raw_profile_values as (
    select value_rows.dimension, nullif(value_rows.raw_label, '') as raw_label
    from filtered_responses f
    cross join lateral (
      values
        ('gender', f.gender),
        ('semester_group', f.semester_group),
        ('department', f.department),
        ('rc', f.rc),
        ('dormitory', f.dormitory),
        ('room_type', f.room_type),
        ('dorm_experience', f.dorm_experience)
    ) as value_rows(dimension, raw_label)
  ),
  profile_options as (
    select d.payload_key, o.option_value, o.option_label, o.order_index
    from dimensions d
    left join lateral private.analysis_profile_options(p_survey_id, d.payload_key) o on true
  ),
  option_presence as (
    select payload_key, count(option_value) > 0 as has_options
    from profile_options
    group by payload_key
  ),
  normalized_profile_values as (
    select
      rv.dimension,
      case
        when rv.raw_label is null then '기타/미분류'
        when op.has_options and exists (
          select 1
          from profile_options po
          where po.payload_key = rv.dimension
            and po.option_value = rv.raw_label
        ) then rv.raw_label
        when op.has_options then '기타/미분류'
        else rv.raw_label
      end as option_value
    from raw_profile_values rv
    join option_presence op on op.payload_key = rv.dimension
  ),
  profile_counts as (
    select dimension, option_value, count(*)::integer as n
    from normalized_profile_values
    group by dimension, option_value
  ),
  profile_totals as (
    select d.payload_key, count(n.option_value)::numeric as n
    from dimensions d
    left join normalized_profile_values n on n.dimension = d.payload_key
    group by d.payload_key
  ),
  profile_labels as (
    select po.payload_key, po.option_value, po.option_label, po.order_index, false as is_unclassified
    from profile_options po
    where po.option_value is not null
    union all
    select pc.dimension, '기타/미분류', '기타/미분류', 999999, true
    from profile_counts pc
    where pc.option_value = '기타/미분류'
    group by pc.dimension
    union all
    select
      pc.dimension,
      pc.option_value,
      pc.option_value,
      1000000 + row_number() over (partition by pc.dimension order by pc.option_value)::integer,
      false
    from profile_counts pc
    join option_presence op on op.payload_key = pc.dimension
    where not op.has_options
      and pc.option_value <> '기타/미분류'
  ),
  distribution_rows as (
    select
      pl.payload_key,
      jsonb_agg(
        jsonb_build_object(
          'key', pl.option_value,
          'label', pl.option_label,
          'n', coalesce(pc.n, 0),
          'percentage', case when pt.n > 0 then round((coalesce(pc.n, 0)::numeric / pt.n) * 100, 1) else 0 end,
          'isUnclassified', pl.is_unclassified
        )
        order by pl.order_index
      ) as distribution
    from profile_labels pl
    left join profile_counts pc on pc.dimension = pl.payload_key and pc.option_value = pl.option_value
    join profile_totals pt on pt.payload_key = pl.payload_key
    group by pl.payload_key
  ),
  low_sample_rows as (
    select d.output_key as dimension, pl.option_label as label, coalesce(pc.n, 0) as n, d.order_index
    from dimensions d
    join profile_labels pl on pl.payload_key = d.payload_key
    left join profile_counts pc on pc.dimension = pl.payload_key and pc.option_value = pl.option_value
    cross join threshold
    where coalesce(pc.n, 0) > 0
      and coalesce(pc.n, 0) < threshold.value
  )
  select
    counts.total_responses,
    counts.submitted_responses,
    counts.filtered_responses,
    threshold.value as low_sample_threshold,
    counts.filtered_responses > 0 and counts.filtered_responses < threshold.value as is_low_sample,
    jsonb_build_object(
      'gender', coalesce((select distribution from distribution_rows where payload_key = 'gender'), '[]'::jsonb),
      'semesterGroups', coalesce((select distribution from distribution_rows where payload_key = 'semester_group'), '[]'::jsonb),
      'department', coalesce((select distribution from distribution_rows where payload_key = 'department'), '[]'::jsonb),
      'rc', coalesce((select distribution from distribution_rows where payload_key = 'rc'), '[]'::jsonb),
      'dormitory', coalesce((select distribution from distribution_rows where payload_key = 'dormitory'), '[]'::jsonb),
      'roomType', coalesce((select distribution from distribution_rows where payload_key = 'room_type'), '[]'::jsonb),
      'dormExperience', coalesce((select distribution from distribution_rows where payload_key = 'dorm_experience'), '[]'::jsonb)
    ) as profile_distribution,
    (
      select coalesce(
        jsonb_agg(jsonb_build_object('dimension', dimension, 'label', label, 'n', n) order by order_index, n asc, label),
        '[]'::jsonb
      )
      from low_sample_rows
    ) as low_sample_groups
  from counts
  cross join threshold;
$$;

analyze public.admin_members;
analyze public.surveys;
analyze public.survey_sections;
analyze public.questions;
analyze public.survey_assets;
analyze public.survey_collaborators;
analyze public.responses;
analyze public.answers;
