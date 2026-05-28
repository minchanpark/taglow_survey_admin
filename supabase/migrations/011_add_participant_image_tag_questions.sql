alter table public.questions
drop constraint if exists questions_question_type_check;

alter table public.questions
add constraint questions_question_type_check
check (
  question_type = any (
    array[
      'profile',
      'experience',
      'scale',
      'single_choice',
      'multi_select',
      'ranking',
      'text',
      'image_tag',
      'participant_image_tag',
      'attention_check'
    ]::text[]
  )
);

alter table public.answers
drop constraint if exists answers_answer_type_check;

alter table public.answers
add constraint answers_answer_type_check
check (
  answer_type = any (
    array[
      'profile',
      'experience',
      'scale',
      'single_choice',
      'multi_select',
      'ranking',
      'text',
      'image_tag',
      'participant_image_tag',
      'attention_check'
    ]::text[]
  )
);

drop policy if exists "handong users can upload participant question images" on storage.objects;

create policy "handong users can upload participant question images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'survey-assets'
  and private.is_handong_user()
  and split_part(name, '/', 1) = 'participant-uploads'
  and split_part(name, '/', 3) = auth.uid()::text
  and exists (
    select 1
    from public.surveys s
    join public.questions q on q.survey_id = s.id
    where s.id::text = split_part(name, '/', 2)
      and q.id::text = split_part(name, '/', 4)
      and q.question_type = 'participant_image_tag'
      and s.status = 'published'
  )
);

drop policy if exists "handong users can read own participant question images" on storage.objects;

create policy "handong users can read own participant question images"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'survey-assets'
  and private.is_handong_user()
  and split_part(name, '/', 1) = 'participant-uploads'
  and split_part(name, '/', 3) = auth.uid()::text
);
