import type {
  AnalysisFilters,
  ChoiceDistribution,
  ReportBlock,
  ReportDraft,
  ReportMetadata,
  ReportNarrativeBlockResult,
  ReportSourceData,
  TextAnswer,
} from "../../../api/admin/model";
import { profileFilterLabels } from "../../../api/admin/model";
import type { ReportSectionKey } from "../../../store";

type BuildReportDraftArgs = Readonly<{
  surveyId: string;
  metadata: ReportMetadata;
  filters: AnalysisFilters;
  source: ReportSourceData;
  includedSections: Record<ReportSectionKey, boolean>;
  editedSummaries?: Record<string, string>;
  narrativeBlocks?: Record<string, ReportNarrativeBlockResult>;
  generatedAt?: string;
}>;

const lowSampleFallbackThreshold = 10;

export function buildReportDraft(args: BuildReportDraftArgs): ReportDraft {
  const baseN = args.source.responseSummary?.filteredResponses ?? 0;
  const lowSampleThreshold = args.source.responseSummary?.lowSampleThreshold ?? lowSampleFallbackThreshold;
  const blocks: ReportBlock[] = [
    createOverviewBlock(args, baseN, lowSampleThreshold),
    createProfileBlock(args, baseN, lowSampleThreshold),
    createPriorityBlock(args, baseN, lowSampleThreshold),
    createSectionSummaryBlock(args, lowSampleThreshold),
    createQuestionSummaryBlock(args, lowSampleThreshold),
    createChoiceDistributionBlock(args, lowSampleThreshold),
    createTextEvidenceBlock(args, baseN, lowSampleThreshold),
    createRecommendationBlock(args, baseN, lowSampleThreshold),
    createAppendixBlock(args, baseN, lowSampleThreshold),
  ].filter((block) => args.includedSections[block.kind]);

  return {
    surveyId: args.surveyId,
    metadata: args.metadata,
    blocks: blocks.map((block) => applyNarrative(block, args.editedSummaries, args.narrativeBlocks)),
    generatedAt: args.generatedAt ?? new Date().toISOString(),
  };
}

export function exportReportMarkdown(draft: ReportDraft): string {
  const lines: string[] = [
    `# ${draft.metadata.title}`,
    "",
    `- 학기: ${valueOrDash(draft.metadata.term)}`,
    `- 작성일: ${valueOrDash(draft.metadata.reportDate)}`,
    `- 작성자/부서: ${valueOrDash(draft.metadata.author)}`,
    `- 조사 기간: ${valueOrDash(draft.metadata.surveyPeriod)}`,
    `- 대상: ${valueOrDash(draft.metadata.audience)}`,
    `- 방식: ${valueOrDash(draft.metadata.method)}`,
    `- 목적: ${valueOrDash(draft.metadata.purpose)}`,
    "",
    "## 목차",
    "",
    ...draft.blocks.map((block, index) => `${index + 1}. ${block.title}`),
    "",
  ];

  draft.blocks.forEach((block) => {
    lines.push(`## ${block.title}`);
    lines.push("");
    lines.push(`- 응답 수: N=${block.n}`);
    lines.push(`- 적용 조건: ${formatFilterSummary(block.filters)}`);
    if (block.isLowSample) lines.push("- 해석 주의: N이 낮아 방향성 참고용으로 해석해야 합니다.");
    if (block.caution) lines.push(`- AI 주의 문구: ${block.caution}`);
    lines.push("");
    lines.push(block.summary);
    lines.push("");
    if (block.body?.length) {
      block.body.forEach((item) => lines.push(`- ${item}`));
      lines.push("");
    }
    if (block.evidence.length) {
      lines.push("근거:");
      block.evidence.forEach((evidence) => {
        lines.push(`- ${evidence.label}${typeof evidence.n === "number" ? ` (N=${evidence.n})` : ""}`);
      });
      lines.push("");
    }
    if (block.suggestedActions?.length) {
      lines.push("제안 조치:");
      block.suggestedActions.forEach((action) => lines.push(`- ${action}`));
      lines.push("");
    }
  });

  return `${lines.join("\n").trim()}\n`;
}

export function downloadMarkdown(filename: string, markdown: string) {
  const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function formatFilterSummary(filters: AnalysisFilters): string {
  const entries = Object.entries(filters)
    .filter(([, value]) => typeof value === "string" && value.trim().length > 0)
    .map(([key, value]) => `${profileFilterLabels[key as keyof typeof profileFilterLabels] ?? key}: ${value}`);
  return entries.length ? entries.join(" · ") : "전체 응답";
}

function createOverviewBlock(args: BuildReportDraftArgs, n: number, lowSampleThreshold: number): ReportBlock {
  const summary = args.source.responseSummary
    ? `제출 완료 ${formatCount(args.source.responseSummary.submittedResponses)}명 중 현재 조건에 해당하는 응답은 ${formatCount(n)}명입니다.`
    : "응답 현황 데이터를 불러오는 중입니다.";
  return {
    id: "overview",
    kind: "overview",
    title: "조사 개괄",
    summary,
    n,
    filters: args.filters,
    isLowSample: isLowSample(n, lowSampleThreshold),
    evidence: [{ id: "response-summary", label: "응답 현황", source: "response_summary", n }],
    body: [
      `조사 방식: ${valueOrDash(args.metadata.method)}`,
      `조사 대상: ${valueOrDash(args.metadata.audience)}`,
      `조사 목적: ${valueOrDash(args.metadata.purpose)}`,
    ],
  };
}

function createProfileBlock(args: BuildReportDraftArgs, n: number, lowSampleThreshold: number): ReportBlock {
  const topItems = Object.entries(args.source.profileDistribution ?? {})
    .flatMap(([dimension, items]) => items.slice(0, 3).map((item) => `${profileFilterLabels[dimension as keyof typeof profileFilterLabels] ?? dimension} ${item.label} ${item.n}명`))
    .slice(0, 6);
  return {
    id: "response-profile",
    kind: "response_profile",
    title: "응답자 현황",
    summary: topItems.length ? `주요 응답자 구성은 ${topItems.join(", ")}입니다.` : "기본 정보별 응답 분포가 아직 충분하지 않습니다.",
    n,
    filters: args.filters,
    isLowSample: isLowSample(n, lowSampleThreshold),
    evidence: [{ id: "profile-distribution", label: "기본 정보별 응답 분포", source: "response_summary", n }],
    body: topItems,
  };
}

function createPriorityBlock(args: BuildReportDraftArgs, n: number, lowSampleThreshold: number): ReportBlock {
  const priorities = args.source.priorities.filter((issue) => issue.source !== "borich").slice(0, 5);
  return {
    id: "priority",
    kind: "priority",
    title: "주요 요약",
    summary: priorities.length
      ? `먼저 확인할 개선 항목은 ${priorities.map((issue) => issue.label).join(", ")}입니다.`
      : "개선 우선순위가 아직 계산되지 않았습니다.",
    n,
    filters: args.filters,
    isLowSample: isLowSample(n, lowSampleThreshold),
    evidence: priorities.map((issue) => ({ id: issue.id, label: issue.label, source: "priority", n: issue.n })),
    body: priorities.map((issue, index) => `${index + 1}. ${issue.label}: 만족도 ${formatScore(issue.averageSatisfaction)}, 서술형 ${issue.textCount}개, 사진 표시 ${issue.tagCount}개`),
  };
}

function createSectionSummaryBlock(args: BuildReportDraftArgs, lowSampleThreshold: number): ReportBlock {
  const rows = [...args.source.sectionSummaries].sort(sortNullableScoreAsc).slice(0, 8);
  const n = maxN(rows);
  return {
    id: "section-summary",
    kind: "section_summary",
    title: "영역별 분석",
    summary: rows.length ? `만족도가 낮은 영역은 ${rows.slice(0, 3).map((row) => row.sectionTitle).join(", ")}입니다.` : "영역별 만족도 데이터가 없습니다.",
    n,
    filters: args.filters,
    isLowSample: isLowSample(n, lowSampleThreshold),
    evidence: rows.map((row) => ({ id: row.sectionId, label: row.sectionTitle, source: "section", n: row.n })),
    body: rows.map((row) => `${row.sectionTitle}: 평균 ${formatScore(row.averageScore)}, 응답 수 ${row.n}명`),
  };
}

function createQuestionSummaryBlock(args: BuildReportDraftArgs, lowSampleThreshold: number): ReportBlock {
  const rows = args.source.questionSummaries
    .filter((row) => row.metricType !== "importance")
    .sort(sortNullableScoreAsc)
    .slice(0, 10);
  const n = maxN(rows);
  return {
    id: "question-summary",
    kind: "question_summary",
    title: "문항별 분석",
    summary: rows.length ? `질문 단위에서는 ${rows.slice(0, 3).map((row) => row.questionTitle).join(", ")}를 우선 확인해야 합니다.` : "문항별 점수 데이터가 없습니다.",
    n,
    filters: args.filters,
    isLowSample: isLowSample(n, lowSampleThreshold),
    evidence: rows.map((row) => ({ id: row.questionId, label: row.questionTitle, source: "question", n: row.n })),
    body: rows.map((row) => `${row.questionTitle}: 평균 ${formatScore(row.averageScore)}, 응답 수 ${row.n}명`),
  };
}

function createChoiceDistributionBlock(args: BuildReportDraftArgs, lowSampleThreshold: number): ReportBlock {
  const grouped = groupChoiceDistributions(args.source.choiceDistributions).slice(0, 8);
  const n = Math.max(0, ...grouped.map((group) => group.n));
  return {
    id: "choice-distribution",
    kind: "choice_distribution",
    title: "선택형 응답 분포",
    summary: grouped.length ? "선택형 문항의 상위 응답 비율을 함께 확인했습니다." : "선택형 응답 분포 데이터가 없습니다.",
    n,
    filters: args.filters,
    isLowSample: isLowSample(n, lowSampleThreshold),
    evidence: grouped.map((group) => ({ id: group.questionId, label: group.questionTitle, source: "choice", n: group.n })),
    body: grouped.map((group) => `${group.questionTitle}: ${group.topOptionLabel} ${formatPercent(group.topPercentage)} (${group.topCount}명)`),
  };
}

function createTextEvidenceBlock(args: BuildReportDraftArgs, n: number, lowSampleThreshold: number): ReportBlock {
  const groups = args.source.textGroups.slice(0, 6);
  const examples = args.source.textAnswers.slice(0, 5);
  return {
    id: "text-evidence",
    kind: "text_evidence",
    title: "주관식 상세",
    summary: groups.length ? `주관식 의견은 ${groups.map((group) => group.label).join(", ")} 주제로 묶입니다.` : "대표 주관식 의견이 아직 없습니다.",
    n,
    filters: args.filters,
    isLowSample: isLowSample(n, lowSampleThreshold),
    evidence: groups.map((group) => ({ id: group.groupKey, label: group.label, source: "text", n: group.count })),
    body: [
      ...groups.map((group) => `${group.label}: ${group.count}건, 대표 의견 ${quoteText(group.representativeTexts[0])}`),
      ...examples.map((answer) => `원문 예시: ${quoteText(answer.textValue)}`),
    ].slice(0, 10),
  };
}

function createRecommendationBlock(args: BuildReportDraftArgs, n: number, lowSampleThreshold: number): ReportBlock {
  const topPriority = args.source.priorities.find((issue) => issue.source !== "borich");
  const lowSection = [...args.source.sectionSummaries].sort(sortNullableScoreAsc)[0];
  const body = [
    topPriority ? `${topPriority.label}에 대한 단기 개선안을 먼저 정리합니다.` : undefined,
    lowSection ? `${lowSection.sectionTitle} 영역은 후속 면담 또는 현장 확인을 권장합니다.` : undefined,
    "N과 필터 조건을 함께 표시해 과도한 일반화를 피합니다.",
  ].filter((value): value is string => Boolean(value));
  return {
    id: "recommendation",
    kind: "recommendation",
    title: "종합 평가 및 제언",
    summary: body[0] ?? "응답이 쌓이면 개선 제언을 더 구체화할 수 있습니다.",
    n,
    filters: args.filters,
    isLowSample: isLowSample(n, lowSampleThreshold),
    evidence: [],
    body,
  };
}

function createAppendixBlock(args: BuildReportDraftArgs, n: number, lowSampleThreshold: number): ReportBlock {
  return {
    id: "appendix",
    kind: "appendix",
    title: "근거 데이터",
    summary: "보고서 본문에 사용한 카드와 근거 목록입니다.",
    n,
    filters: args.filters,
    isLowSample: isLowSample(n, lowSampleThreshold),
    evidence: [
      { id: "response-summary", label: "응답 현황", source: "response_summary", n },
      ...args.source.sectionSummaries.slice(0, 5).map((row) => ({ id: row.sectionId, label: row.sectionTitle, source: "section" as const, n: row.n })),
      ...args.source.textGroups.slice(0, 5).map((row) => ({ id: row.groupKey, label: row.label, source: "text" as const, n: row.count })),
    ],
  };
}

function applyNarrative(
  block: ReportBlock,
  editedSummaries: Record<string, string> | undefined,
  narrativeBlocks: Record<string, ReportNarrativeBlockResult> | undefined,
): ReportBlock {
  const summary = editedSummaries?.[block.id]?.trim();
  const narrative = narrativeBlocks?.[block.id];
  return {
    ...block,
    summary: summary || block.summary,
    body: narrative?.body?.length ? narrative.body : block.body,
    caution: narrative?.caution,
    suggestedActions: narrative?.suggestedActions,
    narrativeEvidenceIds: narrative?.evidenceIds,
  };
}

function groupChoiceDistributions(distributions: ChoiceDistribution[]) {
  const byQuestion = new Map<string, ChoiceDistribution[]>();
  distributions.forEach((row) => byQuestion.set(row.questionId, [...(byQuestion.get(row.questionId) ?? []), row]));
  return [...byQuestion.values()].map((rows) => {
    const sorted = [...rows].sort((a, b) => b.percentage - a.percentage);
    const top = sorted[0];
    return {
      questionId: top?.questionId ?? "",
      questionTitle: top?.questionTitle ?? "제목 없는 질문",
      n: top?.n ?? 0,
      topOptionLabel: top?.optionLabel ?? "-",
      topPercentage: top?.percentage ?? 0,
      topCount: top?.count ?? 0,
    };
  });
}

function sortNullableScoreAsc<T extends { averageScore: number | null }>(a: T, b: T): number {
  return (a.averageScore ?? Number.POSITIVE_INFINITY) - (b.averageScore ?? Number.POSITIVE_INFINITY);
}

function maxN(rows: Array<{ n: number }>): number {
  return Math.max(0, ...rows.map((row) => row.n));
}

function isLowSample(n: number, threshold: number): boolean {
  return n > 0 && n < threshold;
}

function formatCount(value: number): string {
  return value.toLocaleString("ko-KR");
}

function formatScore(value: number | null): string {
  return typeof value === "number" ? value.toFixed(2) : "-";
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

function quoteText(value: string | undefined): string {
  if (!value) return "-";
  const compact = value.replace(/\s+/g, " ").trim();
  return compact.length > 80 ? `"${compact.slice(0, 80)}..."` : `"${compact}"`;
}

function valueOrDash(value: string): string {
  return value.trim() || "-";
}
