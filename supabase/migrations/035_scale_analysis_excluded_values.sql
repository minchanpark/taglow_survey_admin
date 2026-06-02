create or replace function private.analysis_excluded_values(p_config jsonb)
returns numeric[]
language sql
immutable
as $$
  with source_array as (
    select case
      when jsonb_typeof(coalesce(p_config, '{}'::jsonb)->'excludedValues') = 'array' then coalesce(p_config, '{}'::jsonb)->'excludedValues'
      when jsonb_typeof(coalesce(p_config, '{}'::jsonb)->'analysisExcludedValues') = 'array' then coalesce(p_config, '{}'::jsonb)->'analysisExcludedValues'
      when jsonb_typeof(coalesce(p_config, '{}'::jsonb)->'excluded_values') = 'array' then coalesce(p_config, '{}'::jsonb)->'excluded_values'
      else '[]'::jsonb
    end as items
  ),
  raw_values as (
    select item #>> '{}' as value_text
    from source_array
    cross join lateral jsonb_array_elements(source_array.items) as value_items(item)
  ),
  numeric_values as (
    select distinct value_text::numeric as value
    from raw_values
    where value_text ~ '^-?[0-9]+(\.[0-9]+)?$'
  )
  select coalesce(array_agg(value order by value), array[]::numeric[])
  from numeric_values;
$$;

create or replace function private.analysis_has_excluded_values(p_config jsonb)
returns boolean
language sql
immutable
as $$
  select
    coalesce(jsonb_typeof(coalesce(p_config, '{}'::jsonb)->'excludedValues') = 'array', false)
    or coalesce(jsonb_typeof(coalesce(p_config, '{}'::jsonb)->'analysisExcludedValues') = 'array', false)
    or coalesce(jsonb_typeof(coalesce(p_config, '{}'::jsonb)->'excluded_values') = 'array', false);
$$;

create or replace function private.analysis_score_for_average(
  p_score numeric,
  p_metric_type text,
  p_question_config jsonb
)
returns numeric
language sql
immutable
as $$
  select case
    when p_score is null then null
    when p_score = any(private.analysis_excluded_values(coalesce(p_question_config, '{}'::jsonb))) then null
    when coalesce(p_metric_type, '') = 'importance' then p_score
    when coalesce(private.analysis_scale_max(coalesce(p_question_config, '{}'::jsonb)), 5) >= 7
      and not private.analysis_has_excluded_values(coalesce(p_question_config, '{}'::jsonb))
      and p_score in (1, coalesce(private.analysis_scale_max(coalesce(p_question_config, '{}'::jsonb)), 7)) then null
    when coalesce(private.analysis_scale_max(coalesce(p_question_config, '{}'::jsonb)), 5) >= 7 then p_score - 1
    else p_score
  end;
$$;

notify pgrst, 'reload schema';
