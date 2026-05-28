create or replace function public.create_next_survey_version(p_survey_id uuid)
returns public.surveys
language plpgsql
set search_path to 'public'
as $$
declare
  v_source public.surveys%rowtype;
  v_new public.surveys%rowtype;
  v_next_version integer;
  v_new_section_id uuid;
  v_new_question_id uuid;
  v_mapped_section_id uuid;
  v_mapped_question_id uuid;
  section_row record;
  question_row record;
  asset_row record;
begin
  if auth.uid() is null then
    raise exception 'Login is required to create a new survey version.';
  end if;

  if not exists (
    select 1
    from public.admin_members am
    where am.user_id = auth.uid()
      and am.is_active = true
  ) then
    raise exception 'Active admin membership is required.';
  end if;

  select *
    into v_source
  from public.surveys
  where id = p_survey_id;

  if not found then
    raise exception 'Survey not found.';
  end if;

  if v_source.created_by <> auth.uid() then
    raise exception 'Only the survey owner can create a new version.';
  end if;

  select coalesce(max(version_number), 0) + 1
    into v_next_version
  from public.surveys
  where version_group_id = v_source.version_group_id;

  update public.surveys
  set is_latest_version = false
  where version_group_id = v_source.version_group_id
    and created_by = auth.uid();

  insert into public.surveys (
    title,
    description,
    status,
    public_slug,
    version_group_id,
    version_number,
    parent_survey_id,
    is_latest_version,
    settings,
    created_by,
    published_at,
    closed_at
  )
  values (
    v_source.title,
    v_source.description,
    'draft',
    null,
    v_source.version_group_id,
    v_next_version,
    v_source.id,
    true,
    v_source.settings,
    auth.uid(),
    null,
    null
  )
  returning * into v_new;

  create temporary table if not exists taglow_section_id_map (
    old_id uuid primary key,
    new_id uuid not null
  ) on commit drop;

  create temporary table if not exists taglow_question_id_map (
    old_id uuid primary key,
    new_id uuid not null
  ) on commit drop;

  truncate table taglow_section_id_map;
  truncate table taglow_question_id_map;

  for section_row in
    select *
    from public.survey_sections
    where survey_id = v_source.id
    order by order_index
  loop
    insert into public.survey_sections (
      survey_id,
      section_key,
      title_ko,
      title_en,
      description_ko,
      description_en,
      order_index,
      section_type,
      settings
    )
    values (
      v_new.id,
      section_row.section_key,
      section_row.title_ko,
      section_row.title_en,
      section_row.description_ko,
      section_row.description_en,
      section_row.order_index,
      section_row.section_type,
      section_row.settings
    )
    returning id into v_new_section_id;

    insert into taglow_section_id_map (old_id, new_id)
    values (section_row.id, v_new_section_id);
  end loop;

  for question_row in
    select q.*, m.new_id as mapped_section_id
    from public.questions q
    join taglow_section_id_map m on m.old_id = q.section_id
    where q.survey_id = v_source.id
    order by q.order_index
  loop
    insert into public.questions (
      survey_id,
      section_id,
      question_key,
      question_type,
      title_ko,
      title_en,
      description_ko,
      description_en,
      order_index,
      is_required,
      metric_type,
      topic_key,
      space_key,
      config,
      validation
    )
    values (
      v_new.id,
      question_row.mapped_section_id,
      question_row.question_key,
      question_row.question_type,
      question_row.title_ko,
      question_row.title_en,
      question_row.description_ko,
      question_row.description_en,
      question_row.order_index,
      question_row.is_required,
      question_row.metric_type,
      question_row.topic_key,
      question_row.space_key,
      question_row.config,
      question_row.validation
    )
    returning id into v_new_question_id;

    insert into taglow_question_id_map (old_id, new_id)
    values (question_row.id, v_new_question_id);
  end loop;

  for asset_row in
    select *
    from public.survey_assets
    where survey_id = v_source.id
    order by created_at
  loop
    v_mapped_section_id := null;
    v_mapped_question_id := null;

    if asset_row.section_id is not null then
      select new_id
        into v_mapped_section_id
      from taglow_section_id_map
      where old_id = asset_row.section_id;
    end if;

    if asset_row.question_id is not null then
      select new_id
        into v_mapped_question_id
      from taglow_question_id_map
      where old_id = asset_row.question_id;
    end if;

    insert into public.survey_assets (
      survey_id,
      section_id,
      question_id,
      asset_type,
      storage_bucket,
      storage_path,
      metadata
    )
    values (
      v_new.id,
      v_mapped_section_id,
      v_mapped_question_id,
      asset_row.asset_type,
      asset_row.storage_bucket,
      asset_row.storage_path,
      asset_row.metadata
    );
  end loop;

  return v_new;
end;
$$;
