drop function if exists public.get_choice_distribution(uuid, jsonb);

create or replace function public.get_choice_distribution(p_survey_id uuid, p_filters jsonb default '{}'::jsonb)
returns table (
  question_id uuid,
  question_title text,
  question_type text,
  section_id uuid,
  section_title text,
  option_value text,
  option_label text,
  option_order integer,
  row_value text,
  row_label text,
  row_order integer,
  column_value text,
  column_label text,
  column_order integer,
  count bigint,
  n bigint,
  percentage numeric
)
language sql
stable
set search_path to 'private', 'public'
as $$
  with answer_values as (
    select
      a.question_id,
      a.section_id,
      max(coalesce(a.question_title, q.title_ko)) as question_title,
      max(coalesce(a.question_type, q.question_type)) as question_type,
      max(coalesce(a.section_title, s.title_ko)) as section_title,
      option_values.option_value,
      count(*)::bigint as count
    from public.analysis_answer_facts a
    left join public.questions q on q.id = a.question_id and q.survey_id = a.survey_id
    left join public.survey_sections s on s.id = a.section_id and s.survey_id = a.survey_id
    cross join lateral (
      with scalar_value as (
        select coalesce(
          nullif(a.choice_value, ''),
          nullif(a.value_json->>'choiceValue', ''),
          nullif(a.value_json->>'choice_value', ''),
          nullif(a.value_json->>'selectedValue', ''),
          nullif(a.value_json->>'selected_value', ''),
          nullif(a.value_json->>'value', '')
        ) as option_value
      )
      select scalar_value.option_value
      from scalar_value
      where scalar_value.option_value is not null
      union
      select array_values.option_value
      from scalar_value
      cross join lateral (
        select nullif(item.value, '') as option_value
        from jsonb_array_elements_text(case when jsonb_typeof(a.value_json->'values') = 'array' then a.value_json->'values' else '[]'::jsonb end) as item(value)
        union
        select nullif(item.value, '') as option_value
        from jsonb_array_elements_text(case when jsonb_typeof(a.value_json->'choiceValues') = 'array' then a.value_json->'choiceValues' else '[]'::jsonb end) as item(value)
        union
        select nullif(item.value, '') as option_value
        from jsonb_array_elements_text(case when jsonb_typeof(a.value_json->'choice_values') = 'array' then a.value_json->'choice_values' else '[]'::jsonb end) as item(value)
        union
        select nullif(item.value, '') as option_value
        from jsonb_array_elements_text(case when jsonb_typeof(a.value_json->'selectedValues') = 'array' then a.value_json->'selectedValues' else '[]'::jsonb end) as item(value)
        union
        select nullif(item.value, '') as option_value
        from jsonb_array_elements_text(case when jsonb_typeof(a.value_json->'selected_values') = 'array' then a.value_json->'selected_values' else '[]'::jsonb end) as item(value)
        union
        select nullif(item.value, '') as option_value
        from jsonb_array_elements_text(case when jsonb_typeof(a.value_json->'selectedOptions') = 'array' then a.value_json->'selectedOptions' else '[]'::jsonb end) as item(value)
        union
        select nullif(item.value, '') as option_value
        from jsonb_array_elements_text(case when jsonb_typeof(a.value_json->'selected_options') = 'array' then a.value_json->'selected_options' else '[]'::jsonb end) as item(value)
      ) as array_values
      where scalar_value.option_value is null and array_values.option_value is not null
    ) as option_values
    where a.survey_id = p_survey_id
      and a.passed_attention_check = true
      and a.answer_type in ('single_choice', 'multi_select', 'matrix_multi_select', 'ranking', 'profile', 'experience')
      and option_values.option_value is not null
      and private.analysis_fact_matches_filters(
        a.gender, a.semester_group, a.department, a.rc, a.dormitory, a.room_type, a.dorm_experience,
        a.section_id, a.question_id, a.asset_id, a.topic_key, a.space_key, a.tag_type, a.metric_type, a.text_value, p_filters
      )
    group by a.question_id, a.section_id, option_values.option_value
  ),
  totals as (
    select answer_values.question_id, sum(answer_values.count)::bigint as n
    from answer_values
    group by answer_values.question_id
  ),
  option_labels as (
    select
      q.id as question_id,
      option_item.option->>'value' as option_value,
      coalesce(option_item.option->>'labelKo', option_item.option->>'label', option_item.option->>'labelEn', option_item.option->>'value') as option_label,
      option_item.ordinality::integer as option_order
    from public.questions q
    cross join lateral jsonb_array_elements(
      case
        when jsonb_typeof(q.config->'options') = 'array' then q.config->'options'
        else '[]'::jsonb
      end
    ) with ordinality as option_item(option, ordinality)
    where q.survey_id = p_survey_id
  ),
  matrix_rows as (
    select
      q.id as question_id,
      coalesce(row_item.item->>'value', row_item.item->>'id', row_item.item->>'key', 'row_' || row_item.ordinality::text) as row_value,
      coalesce(row_item.item->>'labelKo', row_item.item->>'label', row_item.item->>'labelEn', row_item.item->>'value', '행 ' || row_item.ordinality::text) as row_label,
      row_item.ordinality::integer as row_order
    from public.questions q
    cross join lateral jsonb_array_elements(
      case
        when jsonb_typeof(q.config->'matrixRows') = 'array' then q.config->'matrixRows'
        else '[]'::jsonb
      end
    ) with ordinality as row_item(item, ordinality)
    where q.survey_id = p_survey_id
  ),
  matrix_columns as (
    select
      q.id as question_id,
      coalesce(column_item.item->>'value', column_item.item->>'id', column_item.item->>'key', 'column_' || column_item.ordinality::text) as column_value,
      coalesce(column_item.item->>'labelKo', column_item.item->>'label', column_item.item->>'labelEn', column_item.item->>'value', '열 ' || column_item.ordinality::text) as column_label,
      column_item.ordinality::integer as column_order,
      coalesce(nullif(q.config->>'matrixValueSeparator', ''), '_') as value_separator
    from public.questions q
    cross join lateral jsonb_array_elements(
      case
        when jsonb_typeof(q.config->'matrixColumns') = 'array' then q.config->'matrixColumns'
        else '[]'::jsonb
      end
    ) with ordinality as column_item(item, ordinality)
    where q.survey_id = p_survey_id
  ),
  matrix_cells as (
    select
      matrix_column.question_id,
      matrix_column.column_value || matrix_column.value_separator || matrix_row.row_value as option_value,
      matrix_row.row_value,
      matrix_row.row_label,
      matrix_row.row_order,
      matrix_column.column_value,
      matrix_column.column_label,
      matrix_column.column_order,
      ((matrix_column.column_order - 1) * 10000 + matrix_row.row_order)::integer as option_order
    from matrix_columns matrix_column
    join matrix_rows matrix_row on matrix_row.question_id = matrix_column.question_id
  )
  select
    av.question_id,
    av.question_title,
    av.question_type,
    av.section_id,
    av.section_title,
    coalesce(av.option_value, '기타/미분류') as option_value,
    coalesce(ol.option_label, mc.column_label || ' - ' || mc.row_label, av.option_value, '기타/미분류') as option_label,
    coalesce(ol.option_order, mc.option_order) as option_order,
    mc.row_value,
    mc.row_label,
    mc.row_order,
    mc.column_value,
    mc.column_label,
    mc.column_order,
    av.count,
    t.n,
    case when t.n > 0 then round((av.count::numeric / t.n) * 100, 1) else 0 end as percentage
  from answer_values av
  join totals t on t.question_id = av.question_id
  left join option_labels ol on ol.question_id = av.question_id and ol.option_value = av.option_value
  left join matrix_cells mc on mc.question_id = av.question_id and mc.option_value = av.option_value
  order by av.section_title, av.question_title, coalesce(ol.option_order, mc.option_order) nulls last, option_label;
$$;

grant execute on function public.get_choice_distribution(uuid, jsonb) to authenticated;

analyze public.analysis_answer_facts;
