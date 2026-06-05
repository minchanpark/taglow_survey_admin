---
name: taglow-admin-code-comments
description: "Taglow Survey Admin 전체 코드베이스를 PRD, TDD, AGENTS 지침에 맞춰 분석하고 각 파일의 클래스, 메소드, 함수, 타입, 주요 변수에 쉬운 한국어 1-2줄 주석을 삽입한다. 사용자가 코드 주석 보강, 구조 설명 주석, 전체 프로젝트 주석 작업, 초등학생도 이해할 수 있는 전문적인 설명 주석을 요청하거나 이 스킬만 단독 호출할 때 사용."
---

# Taglow Admin Code Comments

Taglow Survey Admin 코드를 처음 보는 사람이 제품 흐름과 계층 연결을 빠르게 이해하도록 주석을 보강한다. 단독 호출되면 전체 `src/**/*.{ts,tsx}`를 분석하고, 파일별로 역할과 연결 관계가 드러나는 주석 작업을 끝까지 수행한다.

## Read First

필요한 문서를 먼저 읽고, 문서가 없으면 현재 저장소의 실제 파일명을 확인해 가장 가까운 문서를 사용한다.

```sh
sed -n '1,220p' AGENTS.md
sed -n '1,260p' src/AGENTS.md
sed -n '1,260p' dev/Taglow_Survey_Admin_PRD.md
test -f dev/Taglow_survey_Admin_TDD_v2.md && sed -n '1,320p' dev/Taglow_survey_Admin_TDD_v2.md || sed -n '1,320p' dev/Taglow_survey_Admin_TDD.md
```

Before editing any file under `src`, read the nearest `AGENTS.md` for that directory. For comment wording and target rules, read `references/comment-style.md`.

## Quick Inventory

Run the bundled scanner before editing unless the task is scoped to a single file.

```sh
.agents/skills/taglow-admin-code-comments/scripts/scan-comment-targets.sh .
```

Use the output to plan batches by layer:

```text
app -> api/admin -> api/participant -> store -> components -> view -> utils -> tests
```

## Workflow

1. Map the product flow from PRD/TDD:
   `admin auth -> admin_members check -> builder -> preview -> publish URL/QR -> filters -> analysis`.
2. Map the API Boundary before writing comments:
   `View -> Query Hook -> Controller -> Mapper -> Gateway -> Supabase`.
3. Work in small directory batches. For each batch, read its nearest `AGENTS.md`, inspect imports/exports, then add comments with `apply_patch`.
4. Comment every class, exported function, React component, hook, store action, mapper method, gateway method, validation schema, domain type, and meaningful variable that carries product state or connects layers.
5. Keep comments educational but professional: explain what the item does and what it connects to. Prefer simple Korean terms, then include exact technical names when needed.
6. Preserve behavior. Do not rename symbols, reorder logic, change query keys, alter CSS, or refactor while adding comments.
7. Continue until all relevant files are covered unless the user scopes the request.

## Comment Placement

- Put TSDoc above exported declarations, classes, interfaces, type aliases, hooks, React components, schemas, stores, and controller/gateway/mapper methods.
- Put a one-line `//` comment above important local variables or grouped calculations.
- For interface/type properties, use short property comments only when the field carries domain meaning or connects to another layer.
- For JSX-only markup, comment the component or major derived variables, not every DOM element.
- Do not add comments to imports, trivial aliases, loop counters, obvious boolean toggles, or generated/test fixture noise unless they explain a product rule.

## Layer-Specific Emphasis

- `src/app`: explain provider, router, route guard, and runtime wiring.
- `src/api/admin/model`: explain domain models, command objects, analysis/filter types, and how views receive these shapes instead of raw rows.
- `src/api/admin/service/gateway`: explain Supabase calls, raw payload ownership, selected columns, and storage/RPC boundaries.
- `src/api/admin/service/mapper`: explain raw-to-domain conversion and why views should not see DTOs.
- `src/api/admin/controller`: explain use-case orchestration between gateway and mapper.
- `src/api/admin/query`: explain query keys, cache ownership, invalidation, and why hooks are the view-facing API.
- `src/api/participant`: explain public survey read/submit flow separately from admin APIs.
- `src/store`: explain UI-only state and how it complements TanStack Query.
- `src/view`: explain page/component role, query/store connections, preview safety, and analysis intent.
- `src/components`: explain shared UI contracts and props.
- `src/utils`: explain pure helper inputs/outputs and call sites.

## Validation

After each large batch, run at least:

```sh
pnpm typecheck
```

Before handoff, run or report why you skipped:

```sh
pnpm test
rg -n "@supabase|supabase\\.from|supabase\\.storage" src/view src/store src/api/admin/query
rg -n "AdminPayloadMapper|AdminApiGateway" src/view src/store src/api/admin/query
```

Review `git diff` and confirm the change is comment-only except for this skill's own files.
