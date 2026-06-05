# 보고서 작성 기능 v2 계획

## Summary
- 보고서 v2는 현재 보고서 초안 화면을 유지하면서 `AI 초안 생성`, `근거 연결`, `Markdown + 인쇄 PDF 품질`, `분석 탭 시각화 재사용`을 완성한다.
- 보고서 데이터는 기존 분석 query 결과를 재사용한다: 응답 현황, 기본 정보 분포, 개선 우선순위, 영역/문항 요약, 선택형 분포, 주관식 묶음/원문, 이미지 태깅 근거.
- 초안은 v2에서도 서버에 저장하지 않는다. 메타데이터, 포함 섹션, AI/수동 편집 문장은 Zustand 세션 상태로만 유지한다.
- AI는 자동 실행하지 않고 관리자가 명시적으로 `AI 초안 생성`을 눌렀을 때만 실행한다.

## Key Changes
- `ReportDraftPage`는 좌측 보고서 미리보기와 우측 편집 패널을 유지하고, AI 생성 버튼/로딩/실패/부분 성공 상태를 제공한다.
- AI 결과는 기존 `editedSummaries`에 반영한다. 관리자가 수정한 문장은 이후 Markdown export와 print preview에 그대로 반영된다.
- 분석 시각화는 분석 탭 카드 컴포넌트를 재사용한다. 별도 compact chart를 새로 만들지 않는다.
- Markdown export는 AI 요약, N, 필터 조건, low-N 주의, 근거 목록, 제안 조치를 포함한다.
- PDF는 별도 PDF 라이브러리 없이 print-ready CSS와 브라우저 인쇄 저장을 v2 기준으로 유지한다.

## Interfaces
- `ReportNarrativeCommand`는 AI payload 계약이다:
  - `surveyId`, `metadata`, `filters`, `blocks`
  - 블록별 `n`, `isLowSample`, `evidence`, `body`
  - 대표 원문은 길이와 개수를 제한하고 식별 정보는 제외한다.
- `ReportNarrativeResult` 구조:
  - `generatedAt`
  - `blocks[]`: `blockId`, `summary`, `evidenceIds`, `caution`, `suggestedActions`
- API Boundary:
  - View -> Query Hook mutation -> `AdminApiController.generateReportNarrative`
  - Controller -> Gateway -> Supabase Edge Function
- Gateway에는 AI 제공자를 직접 넣지 않는다. 브라우저는 Supabase Function 호출만 한다.
- Supabase Edge Function `generate-report-narrative` 내부에는 `ReportNarrativeProvider` 추상화와 OpenAI 기본 provider를 둔다.
- OpenAI API key, provider, model은 Edge Function secret/env로만 관리하고 브라우저 env에는 추가하지 않는다.

## AI Safety And Failure Behavior
- payload sanitizer는 이름, 학번, 이메일, user id, response id처럼 개인 식별 가능한 값을 보내지 않는다.
- 주관식 원문은 블록당 대표값만 보내며, 긴 문장은 잘라 보낸다.
- low-N 블록은 AI 결과에도 주의 문구를 포함한다. 응답 누락 시 클라이언트가 fallback 주의 문구를 붙인다.
- AI 실패 시 기존 규칙 기반 초안과 수동 편집은 그대로 동작한다.
- AI 응답 JSON 파싱 실패, 일부 block 누락, 잘못된 evidence id는 안전하게 무시하고 부분 성공 상태를 표시한다.

## Test Plan
- Unit:
  - AI payload sanitizer가 식별 정보와 과도한 원문을 제거한다.
  - AI result mapper가 누락 필드, 잘못된 block id/evidence id를 안전하게 처리한다.
  - Markdown export가 AI 요약, 제안 조치, low-N 문구, 근거를 포함한다.
- Component:
  - `ReportDraftPage`에서 AI 생성 버튼, 로딩, 성공, 실패, 부분 성공 상태를 검증한다.
  - AI 결과가 요약 편집 textarea와 보고서 미리보기/export에 반영되는지 검증한다.
  - 샘플 데이터 개발 모드에서도 AI 버튼이 fake controller로 테스트 가능해야 한다.
- Edge Function:
  - fake provider로 정상 JSON, malformed JSON, provider error를 테스트한다.
  - OpenAI provider는 실제 네트워크 호출 없이 adapter 단위로 mock한다.
- Boundary/Performance:
  - `pnpm typecheck`
  - `pnpm test`
  - `rg -n "@supabase|supabase\\.from|supabase\\.storage" src/view src/store src/api/admin/query`
  - `rg -n "AdminPayloadMapper|AdminApiGateway|Raw[A-Z]" src/view src/store src/api/admin/query`

## Assumptions
- `report_drafts` 같은 새 DB 테이블은 만들지 않는다.
- 저장형 보고서, PNG export, CSV export, 카드 순서 drag-and-drop은 v2 범위 밖으로 둔다.
- AI provider는 교체 가능하게 설계하되, 첫 구현은 Supabase Edge Function의 OpenAI provider를 기본값으로 둔다.
- OpenAI 구현은 Responses API와 Structured Outputs를 사용한다.
