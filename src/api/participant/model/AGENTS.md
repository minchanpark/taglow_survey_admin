# `src/api/participant/model` Instructions

Owns participant-facing domain types.

## Rules

- Keep models framework-free.
- Public identifiers are `publicSlug` or `publicCode`; internal UUIDs stay implementation details unless needed by later response submission commands.
