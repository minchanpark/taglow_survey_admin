# `src/view/admin/report/components` Instructions

Owns report draft widgets and export controls.

## Rules

- Components should receive report block models as props.
- Keep export controls explicit about format and scope.
- Do not hide low-N warnings in report output.
- No direct API gateway or Supabase access.
- Keep each report component's CSS beside the component file.
- Component CSS owns report block internals, export controls, drag handles, and evidence display states.
