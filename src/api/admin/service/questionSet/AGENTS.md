# `src/api/admin/service/questionSet` Instructions

Owns survey question-set templates and import planning.

## Rules

- Keep templates framework-free and API-boundary local.
- Return domain command-shaped data only; views must not parse raw template files.
- Stable keys must be deterministic so repeated imports can skip duplicates.
