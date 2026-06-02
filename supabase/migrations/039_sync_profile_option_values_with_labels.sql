with synced_questions as (
  select jsonb_agg(
    jsonb_set(
      option_item.option,
      '{value}',
      to_jsonb(coalesce(
        nullif(option_item.option->>'labelKo', ''),
        nullif(option_item.option->>'label', ''),
        nullif(option_item.option->>'labelEn', ''),
        nullif(option_item.option->>'value', ''),
        concat('option_', option_item.ordinality)
      )),
      true
    )
    order by option_item.ordinality
  ) as options,
  q.id as question_id
  from public.questions q
  cross join lateral jsonb_array_elements(
    case
      when jsonb_typeof(coalesce(q.config, '{}'::jsonb)->'options') = 'array' then coalesce(q.config, '{}'::jsonb)->'options'
      else '[]'::jsonb
    end
  ) with ordinality as option_item(option, ordinality)
  where q.question_type = 'profile'
    and coalesce(q.config, '{}'::jsonb)->>'inputType' = 'single_choice'
    and jsonb_typeof(coalesce(q.config, '{}'::jsonb)->'options') = 'array'
  group by q.id
)
update public.questions q
set config = jsonb_set(
  coalesce(q.config, '{}'::jsonb),
  '{options}',
  synced_questions.options,
  true
)
from synced_questions
where q.id = synced_questions.question_id
  and synced_questions.options is not null;

notify pgrst, 'reload schema';
