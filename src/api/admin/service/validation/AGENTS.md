# `src/api/admin/service/validation` Instructions

Owns Zod schemas and pure validation routines.

## Include

- question config schemas,
- publish validation,
- preview validation,
- filter schema,
- analysis command validation.

## Rules

- Validation should return actionable errors with survey/section/question context when possible.
- Publish validation must cover missing sections, questions, options, image assets, branch targets, and multilingual text.
- Keep validation pure. Do not call Supabase or React APIs here.
