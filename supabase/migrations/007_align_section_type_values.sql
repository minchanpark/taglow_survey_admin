alter table public.survey_sections
  drop constraint if exists survey_sections_section_type_check;

alter table public.survey_sections
  add constraint survey_sections_section_type_check
  check (
    section_type in (
      'intro',
      'profile',
      'general',
      'facility',
      'laundry',
      'global_lounge',
      'identity',
      'completion',
      'satisfaction',
      'space_tagging',
      'free_text',
      'submitter'
    )
  );
