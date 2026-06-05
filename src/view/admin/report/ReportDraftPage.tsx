import { Download, FileDown, FileText, Printer, RefreshCw, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  useChoiceDistributionQuery,
  useFilterOptionsQuery,
  usePriorityTop5Query,
  useQuestionSatisfactionSummaryQuery,
  useResponseSummaryQuery,
  useSectionSatisfactionSummaryQuery,
  useGenerateReportNarrativeMutation,
  useSurveyDetailQuery,
  useTextAnswersInfiniteQuery,
  useTextGroupsQuery,
} from "../../../api/admin/query";
import {
  buildProfileFilterDefinitions,
  mergeProfileFilterDefinitionsWithOptions,
  type AnalysisFilters,
  type ProfileFilterDefinition,
  type ReportBlock,
  type ReportMetadata,
  type ReportSourceData,
} from "../../../api/admin/model";
import { Button, ErrorState, LoadingState, StatusBadge } from "../../../components";
import { useAdminFilterStore, useAdminReportStore, type ReportSectionKey } from "../../../store";
import {
  ChoiceDistributionCard,
  PriorityTop5Card,
  ProfileDistributionCard,
  QuestionAverageCard,
  ResponseSummaryCard,
  SectionAverageCard,
} from "../analysis/components/AnalysisWorkbenchCards";
import { buildReportDraft, downloadMarkdown, exportReportMarkdown, formatFilterSummary } from "./reportDraft";
import "./css/ReportDraftPage.css";

const sectionLabels: ReadonlyArray<Readonly<{ key: ReportSectionKey; label: string }>> = [
  { key: "overview", label: "조사 개괄" },
  { key: "response_profile", label: "응답자 현황" },
  { key: "priority", label: "주요 요약" },
  { key: "section_summary", label: "영역별 분석" },
  { key: "question_summary", label: "문항별 분석" },
  { key: "choice_distribution", label: "선택형 분포" },
  { key: "text_evidence", label: "주관식 상세" },
  { key: "recommendation", label: "종합 제언" },
  { key: "appendix", label: "근거 데이터" },
];

const emptyFilters: AnalysisFilters = {};

export function ReportDraftPage() {
  const { surveyId = "" } = useParams();
  const { surveyId: filterSurveyId, filters } = useAdminFilterStore();
  const activeFilters = filterSurveyId === surveyId ? filters : emptyFilters;
  const {
    metadata,
    includedSections,
    editedSummaries,
    setSurveyId,
    updateMetadata,
    toggleSection,
    setBlockSummary,
    applyNarrativeResult,
    resetReport,
    narrativeBlocks,
  } = useAdminReportStore();
  const { useSampleData, setUseSampleData } = useAdminReportStore();
  const [notice, setNotice] = useState<string | null>(null);

  const detailQuery = useSurveyDetailQuery(surveyId);
  const filterOptionsQuery = useFilterOptionsQuery(surveyId);
  const responseSummaryQuery = useResponseSummaryQuery(surveyId, activeFilters);
  const sectionSummaryQuery = useSectionSatisfactionSummaryQuery(surveyId, activeFilters);
  const questionSummaryQuery = useQuestionSatisfactionSummaryQuery(surveyId, activeFilters);
  const choiceDistributionQuery = useChoiceDistributionQuery(surveyId, activeFilters);
  const priorityTop5Query = usePriorityTop5Query(surveyId, activeFilters);
  const textGroupsQuery = useTextGroupsQuery(surveyId, { ...activeFilters, limit: 20 });
  const textAnswersQuery = useTextAnswersInfiniteQuery(surveyId, { ...activeFilters, limit: 10 });
  const generateNarrativeMutation = useGenerateReportNarrativeMutation();

  useEffect(() => {
    setSurveyId(surveyId || undefined, detailQuery.data?.survey.title ? `${detailQuery.data.survey.title.ko} 분석 보고서` : undefined);
  }, [detailQuery.data?.survey.title, setSurveyId, surveyId]);

  const textAnswers = useMemo(
    () => textAnswersQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [textAnswersQuery.data],
  );
  const liveProfileFilterDefinitions = useMemo(
    () => mergeProfileFilterDefinitionsWithOptions(buildProfileFilterDefinitions(detailQuery.data?.questions ?? []), filterOptionsQuery.data),
    [detailQuery.data?.questions, filterOptionsQuery.data],
  );
  const liveSource = useMemo<ReportSourceData>(
    () => ({
      responseSummary: responseSummaryQuery.data,
      profileDistribution: responseSummaryQuery.data?.profileDistribution,
      priorities: priorityTop5Query.data ?? [],
      sectionSummaries: sectionSummaryQuery.data ?? [],
      questionSummaries: questionSummaryQuery.data ?? [],
      choiceDistributions: choiceDistributionQuery.data ?? [],
      textGroups: textGroupsQuery.data ?? [],
      textAnswers,
    }),
    [
      choiceDistributionQuery.data,
      priorityTop5Query.data,
      questionSummaryQuery.data,
      responseSummaryQuery.data,
      sectionSummaryQuery.data,
      textAnswers,
      textGroupsQuery.data,
    ],
  );
  const hasLiveReportSource = hasLiveReportData(liveSource);
  const isUsingSampleData = import.meta.env.DEV && useSampleData;
  const autoReportTitle = detailQuery.data?.survey.title ? `${detailQuery.data.survey.title.ko} 분석 보고서` : undefined;
  const reportMetadata = isUsingSampleData ? resolveSampleMetadata(metadata, autoReportTitle) : metadata;
  const reportSource = isUsingSampleData ? sampleReportSource : liveSource;
  const reportFilters = isUsingSampleData && !hasActiveFilters(activeFilters) ? sampleReportFilters : activeFilters;
  const reportProfileFilterDefinitions = isUsingSampleData ? sampleProfileFilterDefinitions : liveProfileFilterDefinitions;
  const draft = useMemo(
    () =>
      buildReportDraft({
        surveyId,
        metadata: reportMetadata,
        filters: reportFilters,
        includedSections,
        editedSummaries,
        narrativeBlocks,
        source: reportSource,
      }),
    [
      editedSummaries,
      includedSections,
      narrativeBlocks,
      reportFilters,
      reportMetadata,
      reportSource,
      surveyId,
    ],
  );
  const narrativeSourceDraft = useMemo(
    () =>
      buildReportDraft({
        surveyId,
        metadata: reportMetadata,
        filters: reportFilters,
        includedSections,
        source: reportSource,
      }),
    [
      includedSections,
      reportFilters,
      reportMetadata,
      reportSource,
      surveyId,
    ],
  );

  const dataQueries = [
    responseSummaryQuery,
    filterOptionsQuery,
    sectionSummaryQuery,
    questionSummaryQuery,
    choiceDistributionQuery,
    priorityTop5Query,
    textGroupsQuery,
    textAnswersQuery,
  ];
  const isLoadingReportData = !isUsingSampleData && dataQueries.some((query) => query.isPending);
  const hasReportDataError = !isUsingSampleData && dataQueries.some((query) => query.isError);

  if (!surveyId) {
    return (
      <section className="tg-report-page">
        <ErrorState title="설문 ID가 없습니다." description="설문 목록에서 다시 진입해주세요." />
      </section>
    );
  }

  if (detailQuery.isPending) {
    return (
      <section className="tg-report-page">
        <LoadingState label="보고서 화면을 불러오는 중" />
      </section>
    );
  }

  if (detailQuery.isError || !detailQuery.data) {
    return (
      <section className="tg-report-page">
        <ErrorState title="보고서 화면을 불러오지 못했습니다." description="설문 접근 권한 또는 설문 ID를 확인해주세요." />
      </section>
    );
  }

  return (
    <section className="tg-report-page" aria-labelledby="report-draft-title">
      <header className="tg-report-page__header">
        <div>
          <p>보고서 작성</p>
          <h1 id="report-draft-title">{detailQuery.data.survey.title.ko}</h1>
          <small>{formatFilterSummary(reportFilters)}</small>
        </div>
        <div className="tg-report-page__actions">
          <Link to={`/admin/surveys/${surveyId}/analysis`} className="tg-report-page__link">
            분석 보기
          </Link>
          <Button
            variant="secondary"
            icon={<Download size={15} aria-hidden="true" />}
            onClick={() => {
              downloadMarkdown(`${safeFilename(metadata.title)}.md`, exportReportMarkdown(draft));
              setNotice("Markdown 파일을 내보냈습니다.");
            }}
          >
            Markdown
          </Button>
          <Button
            variant="primary"
            icon={<Printer size={15} aria-hidden="true" />}
            onClick={() => {
              window.print();
            }}
          >
            인쇄 PDF
          </Button>
        </div>
      </header>

      {import.meta.env.DEV ? (
        <section className="tg-report-dev-panel" aria-label="개발 모드 보고서 데이터">
          <div>
            <strong>개발 모드 샘플 데이터</strong>
            <span>
              {isUsingSampleData
                ? "샘플 데이터로 보고서 작성 흐름을 미리봅니다."
                : hasLiveReportSource
                  ? "실제 분석 query 결과를 표시합니다."
                  : "실제 분석 데이터가 비어 있습니다. 샘플 데이터 사용을 켜면 임시 데이터로 미리볼 수 있습니다."}
            </span>
          </div>
          <label className="tg-report-dev-toggle">
            <input
              type="checkbox"
              checked={useSampleData}
              onChange={(event) => setUseSampleData(event.target.checked)}
            />
            <span>샘플 데이터 사용</span>
          </label>
        </section>
      ) : null}

      {notice ? <div className="tg-report-page__notice">{notice}</div> : null}
      {hasReportDataError ? (
        <ErrorState
          title="일부 보고서 데이터를 불러오지 못했습니다."
          description="분석 query를 다시 실행하거나 설문 응답 권한을 확인해주세요."
          actionLabel="다시 시도"
          onAction={() => dataQueries.forEach((query) => void query.refetch())}
        />
      ) : null}

      <div className="tg-report-page__layout">
        <article className="tg-report-preview" aria-label="보고서 미리보기">
          {isLoadingReportData ? <LoadingState label="보고서 데이터를 조립하는 중" /> : null}
          <ReportDocument
            draft={draft}
            source={reportSource}
            filters={reportFilters}
            profileFilterDefinitions={reportProfileFilterDefinitions}
          />
        </article>

        <aside className="tg-report-inspector" aria-label="보고서 설정">
          <section className="tg-report-panel">
            <header className="tg-report-panel__header">
              <div>
                <p>문서 정보</p>
                <h2>메타데이터</h2>
              </div>
              <FileText size={16} aria-hidden="true" />
            </header>
            <MetadataFields metadata={reportMetadata} onChange={updateMetadata} />
          </section>

          <section className="tg-report-panel">
            <header className="tg-report-panel__header">
              <div>
                <p>목차</p>
                <h2>섹션 선택</h2>
              </div>
              <FileDown size={16} aria-hidden="true" />
            </header>
            <div className="tg-report-section-list">
              {sectionLabels.map((section) => (
                <label key={section.key} className="tg-report-check">
                  <input type="checkbox" checked={includedSections[section.key]} onChange={() => toggleSection(section.key)} />
                  <span>{section.label}</span>
                </label>
              ))}
            </div>
          </section>

          <section className="tg-report-panel">
            <header className="tg-report-panel__header">
              <div>
                <p>문장</p>
                <h2>요약 편집</h2>
              </div>
              <Sparkles size={16} aria-hidden="true" />
            </header>
            <Button
              variant="primary"
              icon={<Sparkles size={15} aria-hidden="true" />}
              disabled={generateNarrativeMutation.isPending || draft.blocks.length === 0}
              onClick={async () => {
                try {
                  const result = await generateNarrativeMutation.mutateAsync({
                    surveyId,
                    metadata: reportMetadata,
                    filters: reportFilters,
                    blocks: narrativeSourceDraft.blocks,
                  });
                  applyNarrativeResult(result);
                  setNotice(
                    result.blocks.length === narrativeSourceDraft.blocks.length
                      ? "AI 초안을 생성했습니다."
                      : `AI 초안 ${result.blocks.length}/${narrativeSourceDraft.blocks.length}개를 반영했습니다. 일부 블록은 기존 초안을 유지합니다.`,
                  );
                } catch {
                  setNotice("AI 초안을 생성하지 못했습니다. 규칙 기반 초안과 수동 편집은 계속 사용할 수 있습니다.");
                }
              }}
            >
              {generateNarrativeMutation.isPending ? "AI 생성 중" : "AI 초안 생성"}
            </Button>
            {generateNarrativeMutation.isError ? (
              <p className="tg-report-panel__status">AI 초안을 생성하지 못했습니다. 잠시 후 다시 시도해주세요.</p>
            ) : null}
            <Button
              variant="secondary"
              icon={<Sparkles size={15} aria-hidden="true" />}
              onClick={() => {
                draft.blocks.forEach((block) => setBlockSummary(block.id, createRuleBasedNarrative(block)));
                setNotice("규칙 기반 초안을 생성했습니다.");
              }}
            >
              초안 생성
            </Button>
            <div className="tg-report-summary-editors">
              {draft.blocks.map((block) => (
                <label key={block.id} className="tg-report-field">
                  <span>{block.title}</span>
                  <textarea
                    aria-label={`요약 편집 ${block.title}`}
                    value={editedSummaries[block.id] ?? block.summary}
                    rows={4}
                    onChange={(event) => setBlockSummary(block.id, event.target.value)}
                  />
                </label>
              ))}
            </div>
            <Button
              variant="ghost"
              icon={<RefreshCw size={15} aria-hidden="true" />}
              onClick={() => resetReport(`${detailQuery.data.survey.title.ko} 분석 보고서`)}
            >
              초기화
            </Button>
          </section>
        </aside>
      </div>
    </section>
  );
}

function ReportDocument(props: {
  draft: ReturnType<typeof buildReportDraft>;
  source: ReportSourceData;
  filters: AnalysisFilters;
  profileFilterDefinitions: ReturnType<typeof buildProfileFilterDefinitions>;
}) {
  const overviewBlock = props.draft.blocks.find((block) => block.kind === "overview");
  const summaryBlocks = props.draft.blocks
    .filter((block) => ["priority", "section_summary", "question_summary", "recommendation"].includes(block.kind))
    .slice(0, 4);

  return (
    <div className="tg-report-sheet">
      <header className="tg-report-document-cover">
        <div className="tg-report-document-cover__title">
          <p className="tg-report-kicker">{props.draft.metadata.term || "학기 미입력"}</p>
          <h2>{props.draft.metadata.title}</h2>
          <p>{props.draft.metadata.purpose || "응답 결과를 바탕으로 개선 우선순위와 근거를 정리합니다."}</p>
        </div>
        <dl className="tg-report-document-cover__meta">
          <div>
            <dt>작성일</dt>
            <dd>{props.draft.metadata.reportDate || "-"}</dd>
          </div>
          <div>
            <dt>작성자</dt>
            <dd>{props.draft.metadata.author || "-"}</dd>
          </div>
          <div>
            <dt>조사 기간</dt>
            <dd>{props.draft.metadata.surveyPeriod || "-"}</dd>
          </div>
          <div>
            <dt>대상</dt>
            <dd>{props.draft.metadata.audience || "-"}</dd>
          </div>
          <div>
            <dt>방식</dt>
            <dd>{props.draft.metadata.method || "-"}</dd>
          </div>
          <div>
            <dt>적용 조건</dt>
            <dd>{formatFilterSummary(props.filters)}</dd>
          </div>
        </dl>
        <div className="tg-report-document-cover__stats" aria-label="보고서 핵심 지표">
          <div>
            <span>응답 수</span>
            <strong>N={overviewBlock?.n ?? 0}</strong>
          </div>
          <div>
            <span>포함 섹션</span>
            <strong>{props.draft.blocks.length}</strong>
          </div>
          <div>
            <span>생성 시각</span>
            <strong>{formatReportDateTime(props.draft.generatedAt)}</strong>
          </div>
        </div>
      </header>

      {summaryBlocks.length ? (
        <section className="tg-report-executive-summary" aria-labelledby="report-summary-title">
          <div>
            <p className="tg-report-kicker">요약</p>
            <h3 id="report-summary-title">핵심 요약</h3>
          </div>
          <ol>
            {summaryBlocks.map((block) => (
              <li key={block.id}>
                <strong>{block.title}</strong>
                <span>{block.summary}</span>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      <nav className="tg-report-toc" aria-label="보고서 목차">
        <p className="tg-report-kicker">목차</p>
        <ol>
          {props.draft.blocks.map((block, index) => (
            <li key={block.id}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <a href={`#report-block-${block.id}`}>{block.title}</a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="tg-report-blocks">
        {props.draft.blocks.map((block, index) => (
          <section key={block.id} id={`report-block-${block.id}`} className="tg-report-block">
            <header>
              <div className="tg-report-block__title">
                <span>{String(index + 1).padStart(2, "0")}</span>
                <h3>{block.title}</h3>
              </div>
              <div>
                <StatusBadge tone={block.isLowSample ? "warning" : "info"}>N={block.n}</StatusBadge>
                <span>{formatFilterSummary(block.filters)}</span>
              </div>
            </header>
            <p className="tg-report-block__summary">{block.summary}</p>
            {block.isLowSample || block.caution ? (
              <div className="tg-report-caution">
                {block.isLowSample ? <p>N={block.n}라 해석에 주의가 필요합니다.</p> : null}
                {block.caution ? <p>{block.caution}</p> : null}
              </div>
            ) : null}
            {block.body?.length ? (
              <ul className="tg-report-body-list">
                {block.body.slice(0, 8).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : null}
            {block.suggestedActions?.length ? (
              <div className="tg-report-actions-list" aria-label={`${block.title} 제안 조치`}>
                <span>제안 조치</span>
                <ul>
                  {block.suggestedActions.map((action) => (
                    <li key={action}>{action}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {block.evidence.length ? (
              <footer>
                <span>근거</span>
                {block.evidence.slice(0, 8).map((evidence) => (
                  <small key={evidence.id}>
                    {evidence.label}
                    {typeof evidence.n === "number" ? ` · N=${evidence.n}` : ""}
                  </small>
                ))}
              </footer>
            ) : null}
            <ReportBlockVisual
              surveyId={props.draft.surveyId}
              kind={block.kind}
              source={props.source}
              filters={props.filters}
              profileFilterDefinitions={props.profileFilterDefinitions}
            />
          </section>
        ))}
      </div>
    </div>
  );
}

function ReportBlockVisual(props: {
  surveyId: string;
  kind: ReportSectionKey;
  source: ReportSourceData;
  filters: AnalysisFilters;
  profileFilterDefinitions: ReturnType<typeof buildProfileFilterDefinitions>;
}) {
  const questionSummaries = props.source.questionSummaries.filter((question) => question.metricType !== "importance");

  const visual = (() => {
    switch (props.kind) {
      case "overview":
        return (
          <ResponseSummaryCard
            surveyId={props.surveyId}
            summary={props.source.responseSummary}
            filters={props.filters}
            fields={props.profileFilterDefinitions}
          />
        );
      case "priority":
        return <PriorityTop5Card surveyId={props.surveyId} issues={props.source.priorities} filters={props.filters} />;
      case "response_profile":
        return (
          <ProfileDistributionCard
            surveyId={props.surveyId}
            distribution={props.source.profileDistribution}
            fields={props.profileFilterDefinitions}
            filters={props.filters}
          />
        );
      case "section_summary":
        return <SectionAverageCard surveyId={props.surveyId} sections={props.source.sectionSummaries} filters={props.filters} />;
      case "question_summary":
        return <QuestionAverageCard surveyId={props.surveyId} questions={questionSummaries} filters={props.filters} />;
      case "choice_distribution":
        return <ChoiceDistributionCard surveyId={props.surveyId} distributions={props.source.choiceDistributions} filters={props.filters} />;
      case "text_evidence":
        return null;
      default:
        return null;
    }
  })();

  if (!visual) return null;

  return (
    <section className="tg-report-visuals" aria-label={`${props.kind} 시각화 근거`}>
      <header className="tg-report-visuals__header">
        <p className="tg-report-kicker">시각화 근거</p>
      </header>
      <div className="tg-report-visuals__grid">{visual}</div>
    </section>
  );
}

function MetadataFields(props: { metadata: ReportMetadata; onChange: (metadata: Partial<ReportMetadata>) => void }) {
  const fields: Array<Readonly<{ key: keyof ReportMetadata; label: string; type?: "date" | "textarea" }>> = [
    { key: "title", label: "제목" },
    { key: "term", label: "학기" },
    { key: "reportDate", label: "작성일", type: "date" },
    { key: "author", label: "작성자/부서" },
    { key: "surveyPeriod", label: "조사 기간" },
    { key: "audience", label: "대상" },
    { key: "method", label: "방식" },
    { key: "purpose", label: "목적", type: "textarea" },
  ];
  return (
    <div className="tg-report-fields">
      {fields.map((field) => (
        <label key={field.key} className="tg-report-field">
          <span>{field.label}</span>
          {field.type === "textarea" ? (
            <textarea value={props.metadata[field.key]} rows={3} onChange={(event) => props.onChange({ [field.key]: event.target.value })} />
          ) : (
            <input
              type={field.type ?? "text"}
              value={props.metadata[field.key]}
              onChange={(event) => props.onChange({ [field.key]: event.target.value })}
            />
          )}
        </label>
      ))}
    </div>
  );
}

function createRuleBasedNarrative(block: ReportBlock): string {
  const caution = block.isLowSample ? " 단, 현재 N이 낮아 방향성 참고용으로 해석합니다." : "";
  const evidence = block.evidence[0]?.label ? ` 주요 근거는 ${block.evidence[0].label}입니다.` : "";
  return `${block.summary}${evidence}${caution}`;
}

function safeFilename(value: string): string {
  return value.trim().replace(/[\\/:*?"<>|]+/g, "_") || "taglow-report";
}

function formatReportDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("ko-KR", { month: "2-digit", day: "2-digit" });
}

function hasActiveFilters(filters: AnalysisFilters): boolean {
  return Object.values(filters).some((value) => typeof value === "string" && value.trim().length > 0);
}

function hasLiveReportData(source: ReportSourceData): boolean {
  return Boolean(
    source.responseSummary?.submittedResponses ||
      source.priorities.length ||
      source.sectionSummaries.length ||
      source.questionSummaries.length ||
      source.choiceDistributions.length ||
      source.textGroups.length ||
      source.textAnswers.length,
  );
}

function resolveSampleMetadata(metadata: ReportMetadata, autoReportTitle: string | undefined): ReportMetadata {
  return {
    title: isDefaultText(metadata.title, "설문 분석 보고서") || metadata.title === autoReportTitle ? sampleReportMetadata.title : metadata.title,
    term: metadata.term.trim() || sampleReportMetadata.term,
    reportDate: metadata.reportDate.trim() || sampleReportMetadata.reportDate,
    author: metadata.author.trim() || sampleReportMetadata.author,
    surveyPeriod: metadata.surveyPeriod.trim() || sampleReportMetadata.surveyPeriod,
    audience: metadata.audience.trim() || sampleReportMetadata.audience,
    method: isDefaultText(metadata.method, "온라인 설문") ? sampleReportMetadata.method : metadata.method,
    purpose: isDefaultText(metadata.purpose, "응답 결과를 바탕으로 개선 우선순위와 근거를 정리합니다.")
      ? sampleReportMetadata.purpose
      : metadata.purpose,
  };
}

function isDefaultText(value: string, defaultValue: string): boolean {
  return !value.trim() || value.trim() === defaultValue;
}

const sampleReportFilters: AnalysisFilters = {
  dormitory: "비전관",
  roomType: "2인실",
};

const sampleReportMetadata: ReportMetadata = {
  title: "2026-1 생활관 만족도 분석 보고서",
  term: "2026학년도 1학기",
  reportDate: "2026-06-05",
  author: "생활관자치회 설문분석팀",
  surveyPeriod: "2026.05.20-2026.05.31",
  audience: "생활관 거주 학생",
  method: "온라인 설문, 익명 응답",
  purpose: "생활관 이용 경험을 바탕으로 개선 우선순위와 현장 확인이 필요한 근거를 정리합니다.",
};

const sampleProfileDistribution = {
  gender: [
    { key: "female", label: "여성", n: 68, percentage: 53.1 },
    { key: "male", label: "남성", n: 60, percentage: 46.9 },
  ],
  semesterGroup: [
    { key: "1-2", label: "1-2학기", n: 42, percentage: 32.8 },
    { key: "3-4", label: "3-4학기", n: 51, percentage: 39.8 },
    { key: "5+", label: "5학기 이상", n: 35, percentage: 27.4 },
  ],
  department: [
    { key: "전산전자공학부", label: "전산전자공학부", n: 29, percentage: 22.7 },
    { key: "경영경제학부", label: "경영경제학부", n: 24, percentage: 18.8 },
    { key: "상담심리사회복지학부", label: "상담심리사회복지학부", n: 18, percentage: 14.1 },
  ],
  rc: [
    { key: "장기려", label: "장기려 RC", n: 46, percentage: 35.9 },
    { key: "카이퍼", label: "카이퍼 RC", n: 39, percentage: 30.5 },
    { key: "손양원", label: "손양원 RC", n: 33, percentage: 25.8 },
  ],
  dormitory: [
    { key: "비전관", label: "비전관", n: 76, percentage: 59.4 },
    { key: "하용조관", label: "하용조관", n: 31, percentage: 24.2 },
    { key: "카이퍼관", label: "카이퍼관", n: 21, percentage: 16.4 },
  ],
  roomType: [
    { key: "2인실", label: "2인실", n: 83, percentage: 64.8 },
    { key: "3인실", label: "3인실", n: 45, percentage: 35.2 },
  ],
  dormExperience: [
    { key: "first", label: "첫 생활관", n: 37, percentage: 28.9 },
    { key: "returning", label: "재거주", n: 91, percentage: 71.1 },
  ],
};

const sampleProfileFilterDefinitions: ProfileFilterDefinition[] = [
  {
    key: "gender",
    profileField: "gender",
    label: "성별",
    options: sampleProfileDistribution.gender.map((item) => ({ value: item.key, label: item.label })),
    questionId: "sample-profile-gender",
    questionKey: "profile_gender",
    orderIndex: -7,
  },
  {
    key: "semesterGroup",
    profileField: "semester_group",
    label: "학기",
    options: sampleProfileDistribution.semesterGroup.map((item) => ({ value: item.key, label: item.label })),
    questionId: "sample-profile-semester",
    questionKey: "profile_semester_group",
    orderIndex: -6,
  },
  {
    key: "department",
    profileField: "department",
    label: "학부",
    options: sampleProfileDistribution.department.map((item) => ({ value: item.key, label: item.label })),
    questionId: "sample-profile-department",
    questionKey: "profile_department",
    orderIndex: -5,
  },
  {
    key: "rc",
    profileField: "rc",
    label: "RC",
    options: sampleProfileDistribution.rc.map((item) => ({ value: item.key, label: item.label })),
    questionId: "sample-profile-rc",
    questionKey: "profile_rc",
    orderIndex: -4,
  },
  {
    key: "dormitory",
    profileField: "dormitory",
    label: "생활관",
    options: sampleProfileDistribution.dormitory.map((item) => ({ value: item.key, label: item.label })),
    questionId: "sample-profile-dormitory",
    questionKey: "profile_dormitory",
    orderIndex: -3,
  },
  {
    key: "roomType",
    profileField: "room_type",
    label: "인실",
    options: sampleProfileDistribution.roomType.map((item) => ({ value: item.key, label: item.label })),
    questionId: "sample-profile-room-type",
    questionKey: "profile_room_type",
    orderIndex: -2,
  },
  {
    key: "dormExperience",
    profileField: "dorm_experience",
    label: "생활관 경험",
    options: sampleProfileDistribution.dormExperience.map((item) => ({ value: item.key, label: item.label })),
    questionId: "sample-profile-dorm-experience",
    questionKey: "profile_dorm_experience",
    orderIndex: -1,
  },
];

const sampleReportSource: ReportSourceData = {
  responseSummary: {
    totalResponses: 141,
    submittedResponses: 128,
    filteredResponses: 76,
    lowSampleThreshold: 10,
    isLowSample: false,
    profileDistribution: sampleProfileDistribution,
    lowSampleGroups: [
      { dimension: "roomType", label: "3인실", n: 7 },
      { dimension: "department", label: "콘텐츠융합디자인학부", n: 6 },
    ],
  },
  profileDistribution: sampleProfileDistribution,
  priorities: [
    {
      id: "priority-laundry",
      label: "세탁실 대기와 건조 공간 부족",
      source: "mixed",
      topicKey: "laundry",
      sectionTitle: "생활 편의",
      averageImportance: 4.63,
      averageSatisfaction: 2.34,
      gap: 2.29,
      borichScore: 10.61,
      textCount: 27,
      tagCount: 8,
      n: 76,
    },
    {
      id: "priority-shower",
      label: "샤워실 환기와 곰팡이 관리",
      source: "low_satisfaction",
      topicKey: "shower",
      sectionTitle: "시설 위생",
      averageImportance: 4.48,
      averageSatisfaction: 2.51,
      gap: 1.97,
      borichScore: 8.82,
      textCount: 18,
      tagCount: 12,
      n: 72,
    },
    {
      id: "priority-noise",
      label: "심야 소음 대응 기준",
      source: "text",
      topicKey: "noise",
      sectionTitle: "공동생활",
      averageImportance: 4.12,
      averageSatisfaction: 2.76,
      gap: 1.36,
      borichScore: 5.6,
      textCount: 22,
      tagCount: 0,
      n: 74,
    },
    {
      id: "priority-desk",
      label: "책상 조명과 콘센트 위치",
      source: "heatmap",
      topicKey: "room_equipment",
      sectionTitle: "개인 공간",
      averageImportance: 3.9,
      averageSatisfaction: 2.88,
      gap: 1.02,
      borichScore: 3.98,
      textCount: 9,
      tagCount: 17,
      n: 71,
    },
  ],
  sectionSummaries: [
    { sectionId: "sample-section-laundry", sectionTitle: "생활 편의", averageScore: 2.58, n: 76 },
    { sectionId: "sample-section-clean", sectionTitle: "시설 위생", averageScore: 2.71, n: 72 },
    { sectionId: "sample-section-room", sectionTitle: "개인 공간", averageScore: 3.05, n: 74 },
    { sectionId: "sample-section-community", sectionTitle: "공동생활", averageScore: 3.12, n: 73 },
    { sectionId: "sample-section-admin", sectionTitle: "행정/소통", averageScore: 3.44, n: 70 },
  ],
  questionSummaries: [
    {
      questionId: "sample-question-laundry",
      questionTitle: "세탁실 이용 대기 시간은 적절했나요?",
      sectionId: "sample-section-laundry",
      sectionTitle: "생활 편의",
      topicKey: "laundry",
      metricType: "satisfaction",
      averageScore: 2.18,
      standardDeviation: 0.91,
      n: 76,
    },
    {
      questionId: "sample-question-dryer",
      questionTitle: "건조 공간과 건조기 수량에 만족하나요?",
      sectionId: "sample-section-laundry",
      sectionTitle: "생활 편의",
      topicKey: "dryer",
      metricType: "satisfaction",
      averageScore: 2.27,
      standardDeviation: 0.86,
      n: 76,
    },
    {
      questionId: "sample-question-shower",
      questionTitle: "샤워실 환기와 청결 상태에 만족하나요?",
      sectionId: "sample-section-clean",
      sectionTitle: "시설 위생",
      topicKey: "shower",
      metricType: "satisfaction",
      averageScore: 2.51,
      standardDeviation: 1.02,
      n: 72,
    },
    {
      questionId: "sample-question-noise",
      questionTitle: "심야 시간 소음 관리가 충분했나요?",
      sectionId: "sample-section-community",
      sectionTitle: "공동생활",
      topicKey: "noise",
      metricType: "satisfaction",
      averageScore: 2.76,
      standardDeviation: 0.97,
      n: 74,
    },
    {
      questionId: "sample-question-desk",
      questionTitle: "책상 주변 조명과 콘센트 배치에 만족하나요?",
      sectionId: "sample-section-room",
      sectionTitle: "개인 공간",
      topicKey: "room_equipment",
      metricType: "satisfaction",
      averageScore: 2.88,
      standardDeviation: 0.84,
      n: 71,
    },
  ],
  choiceDistributions: [
    { questionId: "sample-choice-time", questionTitle: "세탁실을 주로 이용하는 시간", optionValue: "night", optionLabel: "21시 이후", count: 42, n: 76, percentage: 55.3 },
    { questionId: "sample-choice-time", questionTitle: "세탁실을 주로 이용하는 시간", optionValue: "evening", optionLabel: "18-21시", count: 21, n: 76, percentage: 27.6 },
    { questionId: "sample-choice-time", questionTitle: "세탁실을 주로 이용하는 시간", optionValue: "day", optionLabel: "낮 시간", count: 13, n: 76, percentage: 17.1 },
    { questionId: "sample-choice-contact", questionTitle: "불편 신고 선호 방식", optionValue: "form", optionLabel: "온라인 폼", count: 51, n: 76, percentage: 67.1 },
    { questionId: "sample-choice-contact", questionTitle: "불편 신고 선호 방식", optionValue: "desk", optionLabel: "생활관 데스크", count: 17, n: 76, percentage: 22.4 },
    { questionId: "sample-choice-contact", questionTitle: "불편 신고 선호 방식", optionValue: "chat", optionLabel: "오픈채팅", count: 8, n: 76, percentage: 10.5 },
  ],
  textGroups: [
    {
      groupKey: "sample-text-laundry",
      label: "세탁 대기",
      topicKey: "laundry",
      issueType: "operation",
      questionId: "sample-question-laundry",
      count: 27,
      n: 76,
      representativeTexts: ["밤 시간에는 세탁기가 계속 차 있어서 기다리다 포기하는 경우가 많습니다."],
    },
    {
      groupKey: "sample-text-shower",
      label: "샤워실 환기",
      topicKey: "shower",
      issueType: "facility",
      questionId: "sample-question-shower",
      count: 18,
      n: 72,
      representativeTexts: ["샤워실 안쪽 칸은 냄새가 잘 빠지지 않고 벽면 물때가 금방 생깁니다."],
    },
    {
      groupKey: "sample-text-noise",
      label: "심야 소음",
      topicKey: "noise",
      issueType: "policy",
      questionId: "sample-question-noise",
      count: 22,
      n: 74,
      representativeTexts: ["시험 기간에도 새벽에 복도에서 이야기하는 소리가 크게 들립니다."],
    },
  ],
  textAnswers: [
    {
      id: "sample-answer-1",
      responseId: "sample-response-1",
      questionId: "sample-question-laundry",
      topicKey: "laundry",
      textValue: "밤 시간에는 세탁기가 계속 차 있어서 기다리다 포기하는 경우가 많습니다.",
      valueJson: {},
      profile: { dormitory: "비전관", roomType: "2인실" },
      createdAt: "2026-05-24T12:30:00.000Z",
    },
    {
      id: "sample-answer-2",
      responseId: "sample-response-2",
      questionId: "sample-question-shower",
      topicKey: "shower",
      textValue: "샤워실 안쪽 칸은 냄새가 잘 빠지지 않고 벽면 물때가 금방 생깁니다.",
      valueJson: {},
      profile: { dormitory: "비전관", roomType: "2인실" },
      createdAt: "2026-05-25T09:10:00.000Z",
    },
    {
      id: "sample-answer-3",
      responseId: "sample-response-3",
      questionId: "sample-question-noise",
      topicKey: "noise",
      textValue: "시험 기간에도 새벽에 복도에서 이야기하는 소리가 크게 들립니다.",
      valueJson: {},
      profile: { dormitory: "비전관", roomType: "2인실" },
      createdAt: "2026-05-26T17:42:00.000Z",
    },
  ],
};
