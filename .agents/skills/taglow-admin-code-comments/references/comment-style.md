# Comment Style

Use this reference when adding Taglow Survey Admin code comments.

## Voice

- Write Korean comments in a calm, professional tone.
- Make the first sentence understandable to an elementary student.
- Keep exact technical terms when they help navigation: `Query Hook`, `Controller`, `Mapper`, `Gateway`, `TanStack Query`, `Zustand`, `Supabase`.
- Prefer one or two short lines. Do not write essays inside code.

## Content Formula

Use this pattern:

```text
무엇을 한다 -> 어디와 연결된다
```

Examples:

```ts
/** 관리자 권한을 확인하는 화면용 훅이다.
 * AdminApiController에서 받은 admin_members 결과를 TanStack Query 캐시에 둔다. */
```

```ts
// 선택된 섹션 id를 기억해서 질문 목록과 편집 패널이 같은 위치를 보게 한다.
const selectedSectionId = ...
```

```ts
/** Supabase 응답 행을 화면에서 쓰는 Survey 모델로 바꾼다.
 * View는 이 변환 덕분에 snake_case 원본 행을 직접 알 필요가 없다. */
function mapSurveyRow(...) { ... }
```

## Target Rules

Comment these by default:

- exported React components,
- exported hooks,
- class declarations,
- public methods and important private helpers,
- exported functions,
- exported constants that represent query keys, config, schemas, route maps, stores, or product rules,
- domain model types and meaningful properties,
- command/input types,
- mapper/gateway/controller methods,
- store state fields and actions,
- important derived variables in views, especially selected ids, filtered lists, validation results, mutation payloads, and display summaries.

Skip these unless they hide a product rule:

- imports and re-export barrels,
- loop indexes such as `i` or `index`,
- obvious aliases such as `const data = result.data`,
- test fixture literals repeated only to satisfy setup,
- JSX layout nodes,
- CSS class names and token declarations unless the user explicitly asks for CSS comments.

## Product Terms

Use Taglow product terms consistently:

- 관리자 권한: `admin_members` 기반 접근 확인.
- 설문 빌더: 섹션, 질문, 자산, 분석 메타데이터를 만드는 작업 공간.
- 미리보기: 참여자 화면을 관리자 안에서 확인하지만 `responses`와 `answers`를 만들지 않는 안전 모드.
- 게시: 공개 URL/QR을 만들기 전 검증을 통과시키는 흐름.
- 분석: 필터, 섹션/문항 평균, Gap, Borich, Locus, 주관식 묶음, 이미지 히트맵을 보는 워크벤치.

## Boundary Phrases

Use these short phrases when the comment needs to explain architecture:

- "View가 Supabase를 직접 알지 않게 한다."
- "Query Hook이 화면과 Controller 사이의 출입문 역할을 한다."
- "Mapper가 raw row를 domain model로 번역한다."
- "Controller가 Gateway 호출과 Mapper 변환을 한 흐름으로 묶는다."
- "Zustand는 서버 데이터 복사본이 아니라 화면 선택 상태만 가진다."
- "Preview는 실제 응답 저장 없이 렌더링만 검증한다."

## Quality Bar

A good comment answers both questions:

1. What role does this symbol play?
2. Which other layer, file, or product flow depends on it?

Avoid comments that only repeat the name:

```ts
// surveyId를 저장한다.
const surveyId = ...
```

Prefer comments that explain the connection:

```ts
// 현재 설문 id를 기준으로 섹션, 질문, 미리보기 쿼리가 같은 설문을 바라보게 한다.
const surveyId = ...
```
