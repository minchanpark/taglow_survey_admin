---
name: taglow-admin:test-qa
description: "Taglow Survey Admin 테스트 전략, Vitest/React Testing Library/Playwright 검증, import boundary checks, 기능별 완료 기준, read-only QA 리뷰를 수행할 때 사용."
user-invocable: true
---

# taglow-admin:test-qa

테스트는 PRD/TDD 완료 기준을 깨지 않도록 하는 안전망이다. 위험도와 계층에 맞춰 좁고 강한 테스트를 추가한다.

## Read First

```sh
rg -n "테스트 전략|주요 테스트 케이스|완료 기준|테스트/TDD 시나리오" dev/Taglow_survey_Admin_TDD.md dev/Taglow_Survey_Admin_PRD.md
```

## Test Pyramid

| Layer | Preferred Test |
|---|---|
| Mapper | raw row -> domain model, multilingual fallback, config defaults |
| Gateway | Supabase calls, Storage upload, error normalization with mocked client |
| Controller | command -> gateway payload -> mapped domain result |
| Query | query key shape, invalidation after mutation, success/error state |
| Store | selected section/question, filter reset, preview state |
| View | loading/empty/error/success, form editing, validation warnings |
| E2E | login -> create survey -> add section/question -> preview -> publish -> analysis |

## Required Regression Areas

- Auth: unauthenticated redirect, wrong domain denied, non-allowlisted Handong denied, allowed admin enters.
- Builder: section/question creation, scale metric save, image_tag without asset validation, English missing warning, published structural edit protection.
- Preview: draft preview, mobile mode, branch simulation, no `responses`/`answers` writes.
- Publish: valid survey publishes with slug, invalid survey blocks with actionable errors.
- Analysis: filter options, filtered averages, Borich, heatmap points, low-N warning.
- Boundary: no Supabase SDK in views/query/store, no mapper/gateway imports in views.

## Useful Checks

Adapt commands to the repo's package manager and scripts:

```sh
rg -n "@supabase|supabase\\.from|supabase\\.storage" src/view src/store src/api/admin/query
rg -n "AdminPayloadMapper|AdminApiGateway" src/view src/store src/api/admin/query
rg -n "Raw[A-Z]" src/view src/store src/api/admin/query
npm test
npm run lint
npm run build
```

If frontend behavior changed and a local app exists, run the dev server and use the Browser plugin for key screenshots/interactions.

## Review Output

Lead with findings. For each finding include:

- severity,
- file/line,
- violated PRD/TDD requirement,
- user-visible or data-integrity impact,
- suggested fix,
- missing test if applicable.

If no issues are found, say so and list residual risks or unrun checks.

## Subagent

For independent final review, use `.codex/agents/taglow-admin-test-qa-auditor.toml`. Keep it read-only.
