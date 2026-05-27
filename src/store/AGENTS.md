# `src/store` Instructions

Owns client/UI state with Zustand.

## Include

- `adminBuilderStore.ts`
- `adminPreviewStore.ts`
- `adminFilterStore.ts`
- `uiStore.ts`

## Rules

- Store selection, panel state, preview scenario answers, active filters, tabs, and UI state.
- Do not store canonical server data copied from queries.
- Do not import Supabase SDK, gateways, mappers, or raw rows.
- Keep stores serializable where practical.
- Reset stores when survey id changes if stale selection could corrupt the UI.
