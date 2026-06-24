import { ChevronLeft, ChevronRight, Download, FileText, GitBranch, Layers3, ListChecks, ListFilter, MapPinned, Target, TrendingUp, UserRound } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { getChoiceMatrix, getChoiceOptions } from "../../../../api/admin/model";
import type {
  AnalysisFilters,
  ChoiceDistribution,
  GroupCompareDimension,
  GroupCompareResult,
  HeatmapPoint,
  IdentityResponse,
  IndividualAnswer,
  IndividualResponse,
  PriorityIssue,
  ProfileDistribution,
  ProfileFilterDefinition,
  Question,
  QuestionSummary,
  ResponseSummary,
  SectionSummary,
  SurveySection,
  TextAnswer,
} from "../../../../api/admin/model";
import { Button, EmptyState, StatusBadge } from "../../../../components";
import { downloadElementAsPng } from "../../../../utils/downloadHelper";
import "./css/AnalysisWorkbenchCards.css";

const lowSampleThreshold = 10;
const pieColors = [
  "var(--tg-accent)",
  "var(--tg-chart-teal)",
  "var(--tg-chart-blue)",
  "var(--tg-chart-violet)",
  "var(--tg-chart-amber)",
  "var(--tg-chart-rose)",
  "var(--tg-chart-neutral)",
];

type DistributionItem = Readonly<{
  key: string;
  label: string;
  n: number;
  percentage: number;
}>;

export type GroupCompareTargetOption = Readonly<{
  value: string;
  label: string;
}>;

export function ResponseSummaryCard(props: { surveyId: string; summary?: ResponseSummary; filters: AnalysisFilters }) {
  const summary = props.summary;
  const isFiltered = hasActiveFilters(props.filters);
  return (
    <AnalysisCard
      surveyId={props.surveyId}
      captureKey="response-summary"
      title="응답 현황"
      icon={<ListFilter size={16} aria-hidden="true" />}
      meta={formatFilterSummary(props.filters)}
    >
      <div className="tg-analysis-stat-grid">
        <Metric
          label={isFiltered ? "조건 적용 응답" : "제출 완료"}
          value={formatCount(isFiltered ? summary?.filteredResponses : summary?.submittedResponses)}
          tone={summary?.isLowSample ? "warning" : undefined}
        />
        <Metric label={isFiltered ? "제출 완료 전체" : "전체 응답"} value={formatCount(isFiltered ? summary?.submittedResponses : summary?.totalResponses)} />
        <Metric label={isFiltered ? "전체 응답" : "조건 적용 응답"} value={formatCount(isFiltered ? summary?.totalResponses : summary?.filteredResponses)} />
      </div>
    </AnalysisCard>
  );
}

export function ProfileDistributionCard(props: { surveyId: string; distribution?: ProfileDistribution; fields: ProfileFilterDefinition[]; filters: AnalysisFilters }) {
  const distribution = props.distribution;
  const isFiltered = hasActiveFilters(props.filters);
  return (
    <AnalysisCard
      surveyId={props.surveyId}
      captureKey="profile-distribution"
      title="기본 정보별 응답"
      icon={<Layers3 size={16} aria-hidden="true" />}
      meta={`${formatFilterSummary(props.filters)} · 응답 비율`}
      className="tg-analysis-card--wide"
    >
      <div className="tg-analysis-distribution-grid">
        {props.fields.length ? (
          props.fields.map((field) => (
            <DistributionBlock key={field.key} title={field.label} items={distribution?.[field.key] ?? []} isFiltered={isFiltered} />
          ))
        ) : (
          <EmptyState title="기본 정보 기준이 없습니다." description="기본 정보 질문을 추가하면 항목별 응답 비율이 표시됩니다." />
        )}
      </div>
    </AnalysisCard>
  );
}

export function IdentityResponseCard(props: {
  surveyId: string;
  responses: IdentityResponse[];
  filters: AnalysisFilters;
  hasMore?: boolean;
  isExporting?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
  onExport?: () => void;
}) {
  const visibleResponses = props.responses.filter((response) => response.studentNumber || response.name);
  return (
    <AnalysisCard
      surveyId={props.surveyId}
      captureKey="identity-responses"
      title="상세 명단"
      icon={<UserRound size={16} aria-hidden="true" />}
      meta={`${formatFilterSummary(props.filters)} · 제출 응답 전체`}
      action={
        props.onExport ? (
          <Button
            variant="secondary"
            icon={<Download size={15} aria-hidden="true" />}
            onClick={props.onExport}
            disabled={props.isExporting}
          >
            {props.isExporting ? "내보내는 중" : "명단 내보내기"}
          </Button>
        ) : undefined
      }
      className="tg-analysis-card--wide"
    >
      <p className="tg-analysis-card-summary">표시 중 {visibleResponses.length.toLocaleString("ko-KR")}명</p>
      {visibleResponses.length ? (
        <div className="tg-analysis-table-wrap">
          <table className="tg-analysis-table">
            <thead>
              <tr>
                <th>학번</th>
                <th>이름</th>
                <th>기본 정보</th>
              </tr>
            </thead>
            <tbody>
              {visibleResponses.map((response) => (
                <tr key={response.responseId}>
                  <td>{response.studentNumber ?? "-"}</td>
                  <td>{response.name ?? "-"}</td>
                  <td>{formatProfile(response.profile)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState title="이름과 학번 응답이 없습니다." description="기본 정보에 이름/학번 문항이 있는 제출 응답이 모두 표시됩니다." />
      )}
      {props.hasMore ? (
        <div className="tg-analysis-load-more">
          <Button variant="secondary" onClick={props.onLoadMore} disabled={props.isLoadingMore}>
            {props.isLoadingMore ? "불러오는 중" : "더 보기"}
          </Button>
        </div>
      ) : null}
    </AnalysisCard>
  );
}

export function IndividualResponseCard(props: {
  surveyId: string;
  responses: IndividualResponse[];
  questions?: readonly Question[];
  filters: AnalysisFilters;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [pendingIndex, setPendingIndex] = useState<number | undefined>();
  const activeResponse = props.responses[activeIndex];
  const questionById = useMemo(() => new Map((props.questions ?? []).map((question) => [question.id, question] as const)), [props.questions]);
  const canGoPrevious = activeIndex > 0;
  const canGoNext = pendingIndex === undefined && (activeIndex < props.responses.length - 1 || Boolean(props.hasMore));

  useEffect(() => {
    setActiveIndex((currentIndex) => {
      if (!props.responses.length) return 0;
      return Math.min(currentIndex, props.responses.length - 1);
    });
  }, [props.responses.length]);

  useEffect(() => {
    if (pendingIndex === undefined) return;
    if (props.responses.length > pendingIndex) {
      setActiveIndex(pendingIndex);
      setPendingIndex(undefined);
    }
  }, [pendingIndex, props.responses.length]);

  const goPrevious = () => {
    setPendingIndex(undefined);
    setActiveIndex((currentIndex) => Math.max(0, currentIndex - 1));
  };

  const goNext = () => {
    if (activeIndex < props.responses.length - 1) {
      setActiveIndex((currentIndex) => currentIndex + 1);
      return;
    }
    if (props.hasMore && props.onLoadMore) {
      setPendingIndex(activeIndex + 1);
      props.onLoadMore();
    }
  };

  return (
    <AnalysisCard
      surveyId={props.surveyId}
      captureKey="individual-responses"
      title="개별 응답"
      icon={<ListChecks size={16} aria-hidden="true" />}
      meta={`${formatFilterSummary(props.filters)} · 주의력 확인 통과 응답만`}
      action={
        props.responses.length ? (
          <div className="tg-analysis-response-navigator" aria-label="개별 응답 이동">
            <Button
              variant="secondary"
              icon={<ChevronLeft size={15} aria-hidden="true" />}
              onClick={goPrevious}
              disabled={!canGoPrevious || props.isLoadingMore || pendingIndex !== undefined}
              aria-label="이전 응답"
            />
            <span>
              {activeIndex + 1} / {props.responses.length.toLocaleString("ko-KR")}
              {props.hasMore ? "+" : ""}
            </span>
            <Button
              variant="secondary"
              icon={<ChevronRight size={15} aria-hidden="true" />}
              onClick={goNext}
              disabled={!canGoNext || props.isLoadingMore}
              aria-label="다음 응답"
            />
          </div>
        ) : undefined
      }
      className="tg-analysis-card--wide"
    >
      {activeResponse ? (
        <section className="tg-analysis-individual-response" aria-labelledby={`individual-response-${activeResponse.responseId}`}>
          <header className="tg-analysis-individual-response__header">
            <div>
              <strong id={`individual-response-${activeResponse.responseId}`}>응답 {activeIndex + 1}</strong>
              <span>{formatProfile(activeResponse.profile)}</span>
            </div>
            <div>
              <span>{formatDateTime(activeResponse.submittedAt)}</span>
              <StatusBadge tone="info">답변 {activeResponse.answers.length.toLocaleString("ko-KR")}개</StatusBadge>
            </div>
          </header>
          {activeResponse.answers.length ? (
            <dl className="tg-analysis-individual-answer-list">
              {activeResponse.answers.map((answer) => (
                <div key={answer.id || `${activeResponse.responseId}:${answer.questionId}:${answer.createdAt}`}>
                  <dt>
                    <span>{answer.questionTitle}</span>
                    {answer.sectionTitle ? <small>{answer.sectionTitle}</small> : null}
                  </dt>
                  <dd>
                    <IndividualAnswerValue answer={answer} question={answer.questionId ? questionById.get(answer.questionId) : undefined} />
                    <small>{formatAnswerType(answer.answerType ?? answer.questionType)}</small>
                  </dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="tg-analysis-muted tg-analysis-individual-response__empty">선택한 조건에 해당하는 답변이 없습니다.</p>
          )}
        </section>
      ) : (
        <EmptyState title="개별 응답이 없습니다." description="조건을 줄이거나 응답 수집 후 다시 확인해주세요." />
      )}
      {props.isLoadingMore ? (
        <p className="tg-analysis-muted" role="status">
          다음 응답을 불러오는 중입니다.
        </p>
      ) : null}
    </AnalysisCard>
  );
}

export function PriorityTop5Card(props: { surveyId: string; issues: PriorityIssue[]; filters: AnalysisFilters }) {
  const visibleIssues = props.issues.filter((issue) => issue.source !== "borich").slice(0, 5);
  return (
    <AnalysisCard
      surveyId={props.surveyId}
      captureKey="priority-top5"
      title="먼저 볼 개선 항목 5개"
      icon={<TrendingUp size={16} aria-hidden="true" />}
      meta={formatFilterSummary(props.filters)}
      className="tg-analysis-card--wide"
    >
      {visibleIssues.length ? (
        <ol className="tg-analysis-priority-list">
          {visibleIssues.map((issue, index) => (
            <li key={issue.id}>
              <strong>{index + 1}</strong>
              <div>
                <p>{issue.label}</p>
                <small>
                  만족도 {formatScore(issue.averageSatisfaction)} · 응답 수 {issue.n}명
                  {issue.n > 0 && issue.n < lowSampleThreshold ? " · 해석 주의" : ""}
                </small>
                <small>
                  서술형 의견 {issue.textCount}개 · 사진 표시 {issue.tagCount}개
                </small>
              </div>
              <StatusBadge tone={issue.n > 0 && issue.n < lowSampleThreshold ? "warning" : "info"}>
                {formatPrioritySource(issue.source)}
              </StatusBadge>
            </li>
          ))}
        </ol>
      ) : (
        <EmptyState title="먼저 볼 개선 항목이 없습니다." description="만족도 응답이나 서술형 의견이 쌓이면 표시됩니다." />
      )}
    </AnalysisCard>
  );
}

type IndividualAnswerDisplay = Readonly<{
  summary: string;
  chips: string[];
  details: ReadonlyArray<Readonly<{ label: string; value: string }>>;
}>;

function IndividualAnswerValue(props: { answer: IndividualAnswer; question?: Question }) {
  const display = buildIndividualAnswerDisplay(props.answer, props.question);

  return (
    <div className="tg-analysis-individual-answer-value">
      <p>{display.summary}</p>
      {display.chips.length ? (
        <div className="tg-analysis-individual-answer-value__chips" aria-label="응답 선택값">
          {display.chips.map((chip) => (
            <span key={chip}>{chip}</span>
          ))}
        </div>
      ) : null}
      {display.details.length ? (
        <dl className="tg-analysis-individual-answer-value__details">
          {display.details.map((detail) => (
            <div key={`${detail.label}:${detail.value}`}>
              <dt>{detail.label}</dt>
              <dd>{detail.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </div>
  );
}

function buildIndividualAnswerDisplay(answer: IndividualAnswer, question?: Question): IndividualAnswerDisplay {
  const json = answer.valueJson;
  const details: Array<{ label: string; value: string }> = [];
  const chips = new Set<string>();
  const choiceLabelMap = question ? buildChoiceValueLabelMap(question) : new Map<string, string>();

  const scoreText = answer.scoreValue !== undefined ? `${answer.scoreValue}점` : getDisplayNumberString(json.scoreValue) ?? getDisplayNumberString(json.score_value);
  const categoryValue =
    getNonEmptyString(json.category) ??
    getNonEmptyString(json.low_score_reason) ??
    getNonEmptyString(json.lowScoreReason) ??
    getNonEmptyString(json.choiceValue) ??
    getNonEmptyString(json.choice_value) ??
    answer.choiceValue;
  const categoryLabel = categoryValue ? getGeneralizedLowScoreCategoryLabel(categoryValue) ?? categoryValue : undefined;
  const textValue =
    answer.textValue ??
    getNonEmptyString(json.text) ??
    getNonEmptyString(json.textValue) ??
    getNonEmptyString(json.text_value) ??
    getNonEmptyString(json.low_score_text) ??
    getNonEmptyString(json.lowScoreText);
  const choiceValues = uniqueStrings([
    ...getDisplayStringList(json.values),
    ...getDisplayStringList(json.choiceValues),
    ...getDisplayStringList(json.choice_values),
    ...getDisplayStringList(json.selectedOptions),
    ...getDisplayStringList(json.selected_values),
    ...getDisplayChoiceListFromDisplayValue(answer),
  ]);
  const choiceLabels = choiceValues.map((value) => resolveChoiceDisplayLabel(value, choiceLabelMap));
  const imagePath =
    getNonEmptyString(json.storagePath) ??
    getNonEmptyString(json.storage_path) ??
    getNestedString(json.image, "storagePath") ??
    getNestedString(json.image, "storage_path");

  if (categoryLabel && categoryLabel !== textValue) chips.add(categoryLabel);
  for (const label of choiceLabels) chips.add(label);

  if (textValue && scoreText) details.push({ label: "후속 답변", value: textValue });
  if (categoryLabel && textValue && categoryLabel !== textValue) details.push({ label: "선택 카테고리", value: categoryLabel });
  if (answer.tagType) details.push({ label: "표시 유형", value: answer.tagType });
  if (answer.xRatio !== undefined && answer.yRatio !== undefined) {
    details.push({ label: "표시 위치", value: `가로 ${Math.round(answer.xRatio * 100)}%, 세로 ${Math.round(answer.yRatio * 100)}%` });
  }
  if (imagePath) details.push({ label: "첨부 이미지", value: compactStoragePath(imagePath) });

  for (const detail of getStructuredJsonDetails(json)) {
    if (!details.some((item) => item.label === detail.label && item.value === detail.value)) {
      details.push(detail);
    }
  }

  const summary =
    scoreText ??
    textValue ??
    (choiceLabels.length ? choiceLabels.join(", ") : undefined) ??
    categoryLabel ??
    buildTagSummary(answer) ??
    getPrimaryStructuredJsonValue(json) ??
    getReadableDisplayValue(answer.displayValue) ??
    "응답 없음";

  return {
    summary,
    chips: [...chips].filter((chip) => chip !== summary),
    details: details.filter((detail) => detail.value !== summary),
  };
}

function buildChoiceValueLabelMap(question: Question): Map<string, string> {
  const labels = new Map<string, string>();
  const options = [...getChoiceOptions(question), ...(getChoiceMatrix(question)?.options ?? [])];
  for (const option of options) {
    const label = option.labelKo || option.labelEn || option.value;
    labels.set(option.value, label);
    labels.set(normalizeTextAnswerCategory(option.value), label);
    if (option.labelKo) labels.set(option.labelKo, label);
    if (option.labelEn) labels.set(option.labelEn, label);
  }
  return labels;
}

function resolveChoiceDisplayLabel(value: string, labelMap: ReadonlyMap<string, string>): string {
  return getGeneralizedLowScoreCategoryLabel(value) ?? labelMap.get(value) ?? labelMap.get(normalizeTextAnswerCategory(value)) ?? value;
}

function getDisplayChoiceListFromDisplayValue(answer: IndividualAnswer): string[] {
  if (!isChoiceListAnswer(answer)) return [];
  const displayValue = getReadableDisplayValue(answer.displayValue);
  if (!displayValue) return [];
  return displayValue.split(",").map((item) => item.trim()).filter(Boolean);
}

function isChoiceListAnswer(answer: IndividualAnswer): boolean {
  const type = answer.answerType ?? answer.questionType;
  return type === "multi_select" || type === "matrix_multi_select";
}

function getPrimaryStructuredJsonValue(json: IndividualAnswer["valueJson"]): string | undefined {
  return getStructuredJsonDetails(json).find((detail) => detail.value)?.value;
}

function getStructuredJsonDetails(json: IndividualAnswer["valueJson"]): Array<{ label: string; value: string }> {
  const hiddenKeys = new Set([
    "answer",
    "category",
    "choiceValue",
    "choice_value",
    "choiceValues",
    "choice_values",
    "image",
    "label",
    "lowScoreFollowUp",
    "lowScoreReason",
    "lowScoreText",
    "low_score_followup",
    "low_score_reason",
    "low_score_text",
    "scoreValue",
    "score_value",
    "selectedOptions",
    "selected_values",
    "sourceAnswerType",
    "source_answer_type",
    "storagePath",
    "storage_path",
    "text",
    "textValue",
    "text_value",
    "value",
    "values",
  ]);

  return Object.entries(json)
    .filter(([key]) => !hiddenKeys.has(key))
    .flatMap(([key, value]) => {
      const displayValue = getStructuredJsonDisplayValue(value);
      return displayValue ? [{ label: formatJsonFieldLabel(key), value: displayValue }] : [];
    });
}

function getStructuredJsonDisplayValue(value: unknown): string | undefined {
  if (typeof value === "string") return value.trim() || undefined;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "boolean") return value ? "예" : "아니오";
  const list = getDisplayStringList(value);
  if (list.length) return list.join(", ");
  const record = asUnknownRecord(value);
  if (record) return getNonEmptyString(record.label) ?? getNonEmptyString(record.value) ?? getNonEmptyString(record.name) ?? getNonEmptyString(record.text);
  return undefined;
}

function formatJsonFieldLabel(key: string): string {
  const knownLabels: Record<string, string> = {
    assetId: "이미지",
    asset_id: "이미지",
    sourceAnswerType: "응답 출처",
    source_answer_type: "응답 출처",
    source: "출처",
    tagType: "표시 유형",
    tag_type: "표시 유형",
    xRatio: "가로 위치",
    x_ratio: "가로 위치",
    yRatio: "세로 위치",
    y_ratio: "세로 위치",
  };
  if (knownLabels[key]) return knownLabels[key];
  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toLocaleUpperCase("ko-KR"));
}

function buildTagSummary(answer: IndividualAnswer): string | undefined {
  if (!answer.tagType && answer.xRatio === undefined && answer.yRatio === undefined) return undefined;
  const coordinate =
    answer.xRatio !== undefined && answer.yRatio !== undefined ? `가로 ${Math.round(answer.xRatio * 100)}%, 세로 ${Math.round(answer.yRatio * 100)}%` : undefined;
  return [answer.tagType ?? "이미지 표시", coordinate].filter(Boolean).join(" · ");
}

function getReadableDisplayValue(value: string): string | undefined {
  const trimmedValue = value.trim();
  if (!trimmedValue || trimmedValue === "-") return undefined;
  if (trimmedValue === "응답 없음") return undefined;
  if ((trimmedValue.startsWith("{") && trimmedValue.endsWith("}")) || (trimmedValue.startsWith("[") && trimmedValue.endsWith("]"))) return undefined;
  return trimmedValue;
}

function getDisplayNumberString(value: unknown): string | undefined {
  const numberValue = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(numberValue) ? `${numberValue}점` : undefined;
}

function getDisplayStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === "string" || typeof item === "number") return String(item);
      const record = asUnknownRecord(item);
      if (record) return getNonEmptyString(record.label) ?? getNonEmptyString(record.value) ?? getNonEmptyString(record.name) ?? getNonEmptyString(record.text);
      return undefined;
    })
    .filter((item): item is string => Boolean(item));
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.filter((value) => value.trim()).map((value) => value.trim()))];
}

function getNestedString(value: unknown, key: string): string | undefined {
  const record = asUnknownRecord(value);
  return record ? getNonEmptyString(record[key]) : undefined;
}

function compactStoragePath(value: string): string {
  const parts = value.split("/").filter(Boolean);
  return parts.length > 2 ? parts.slice(-2).join("/") : value;
}

export function SectionAverageCard(props: { surveyId: string; sections: SectionSummary[]; filters: AnalysisFilters }) {
  return (
    <AnalysisCard
      surveyId={props.surveyId}
      captureKey="section-average"
      title="주제별 만족도"
      icon={<Target size={16} aria-hidden="true" />}
      meta={formatFilterSummary(props.filters)}
    >
      <ScoreList
        emptyTitle="주제별 점수 데이터가 없습니다."
        rows={props.sections.map((section) => ({
          key: section.sectionId,
          label: section.sectionTitle,
          score: section.averageScore,
          n: section.n,
        }))}
      />
    </AnalysisCard>
  );
}

export function QuestionAverageCard(props: { surveyId: string; questions: QuestionSummary[]; filters: AnalysisFilters }) {
  const [keyword, setKeyword] = useState("");
  const [sectionId, setSectionId] = useState("all");
  const sectionOptions = useMemo(() => buildSectionOptions(props.questions), [props.questions]);
  const visibleQuestions = useMemo(() => {
    const normalizedKeyword = normalizeSearchText(keyword);
    return props.questions
      .filter((question) => sectionId === "all" || question.sectionId === sectionId)
      .filter((question) => {
        if (!normalizedKeyword) return true;
        return normalizeSearchText(`${question.questionTitle} ${question.sectionTitle ?? ""}`).includes(normalizedKeyword);
      });
  }, [keyword, props.questions, sectionId]);

  return (
    <AnalysisCard
      surveyId={props.surveyId}
      captureKey="question-average"
      title="질문별 점수"
      icon={<Target size={16} aria-hidden="true" />}
      meta={formatFilterSummary(props.filters)}
      className="tg-analysis-card--wide"
      action={
        <div className="tg-analysis-card-controls">
          <label className="tg-analysis-search">
            <span>질문 검색</span>
            <input value={keyword} placeholder="질문명" onChange={(event) => setKeyword(event.target.value)} />
          </label>
          <label className="tg-analysis-inline-select">
            <span>주제</span>
            <select value={sectionId} onChange={(event) => setSectionId(event.target.value)}>
              <option value="all">전체</option>
              {sectionOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      }
    >
      <p className="tg-analysis-card-summary">표시 중 {visibleQuestions.length.toLocaleString("ko-KR")}개 / 전체 {props.questions.length.toLocaleString("ko-KR")}개</p>
      <div className="tg-analysis-table-wrap">
        {visibleQuestions.length ? (
          <table className="tg-analysis-table">
            <thead>
              <tr>
                <th>질문</th>
                <th>주제</th>
                <th>평균 점수</th>
                <th>응답 수</th>
              </tr>
            </thead>
            <tbody>
              {visibleQuestions.map((question) => (
                <tr key={`${question.questionId}:${question.metricType ?? "none"}`}>
                  <td>{question.questionTitle}</td>
                  <td>{question.sectionTitle ?? "주제 없음"}</td>
                  <td>{formatScore(question.averageScore)}</td>
                  <td>
                    <StatusBadge tone={question.n > 0 && question.n < lowSampleThreshold ? "warning" : "info"}>응답 수 {question.n}명</StatusBadge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <EmptyState title="질문별 점수 데이터가 없습니다." description="검색어를 지우거나 조건을 줄여보세요." />
        )}
      </div>
    </AnalysisCard>
  );
}

export function ChoiceDistributionCard(props: { surveyId: string; distributions: ChoiceDistribution[]; filters: AnalysisFilters }) {
  const [keyword, setKeyword] = useState("");
  const [sectionId, setSectionId] = useState("all");
  const sectionOptions = useMemo(() => buildSectionOptions(props.distributions), [props.distributions]);
  const visibleDistributions = useMemo(() => {
    const normalizedKeyword = normalizeSearchText(keyword);
    return props.distributions
      .filter((item) => sectionId === "all" || item.sectionId === sectionId)
      .filter((item) => {
        if (!normalizedKeyword) return true;
        return normalizeSearchText(
          `${item.questionTitle} ${item.sectionTitle ?? ""} ${item.optionLabel} ${item.rowLabel ?? ""} ${item.columnLabel ?? ""}`,
        ).includes(normalizedKeyword);
      });
  }, [keyword, props.distributions, sectionId]);
  const grouped = useMemo(() => groupBy(visibleDistributions, (item) => item.questionId), [visibleDistributions]);
  const totalQuestionCount = useMemo(() => groupBy(props.distributions, (item) => item.questionId).length, [props.distributions]);
  return (
    <AnalysisCard
      surveyId={props.surveyId}
      captureKey="choice-distribution"
      title="문항별 응답 분포"
      icon={<ListFilter size={16} aria-hidden="true" />}
      meta={formatFilterSummary(props.filters)}
      className="tg-analysis-card--wide"
      action={
        <div className="tg-analysis-card-controls">
          <label className="tg-analysis-search">
            <span>문항 검색</span>
            <input value={keyword} placeholder="문항명 또는 보기" onChange={(event) => setKeyword(event.target.value)} />
          </label>
          <label className="tg-analysis-inline-select">
            <span>주제</span>
            <select value={sectionId} onChange={(event) => setSectionId(event.target.value)}>
              <option value="all">전체</option>
              {sectionOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      }
    >
      <p className="tg-analysis-card-summary">표시 중 {grouped.length.toLocaleString("ko-KR")}개 / 전체 {totalQuestionCount.toLocaleString("ko-KR")}개</p>
      {grouped.length ? (
        <div className="tg-analysis-choice-groups">
          {grouped.map(([questionId, rows]) => (
            <section key={questionId} className="tg-analysis-choice-group">
              <header className="tg-analysis-choice-group__header">
                <h3>{rows[0]?.questionTitle ?? "제목 없는 질문"}</h3>
                <StatusBadge tone={(rows[0]?.n ?? 0) > 0 && (rows[0]?.n ?? 0) < lowSampleThreshold ? "warning" : "info"}>
                  {hasMatrixDistribution(rows) ? "선택 수" : "응답 수"} {(rows[0]?.n ?? 0).toLocaleString("ko-KR")}
                  {hasMatrixDistribution(rows) ? "건" : "명"}
                </StatusBadge>
              </header>
              {hasMatrixDistribution(rows) ? (
                <ChoiceMatrixDistributionTable questionTitle={rows[0]?.questionTitle ?? "제목 없는 질문"} rows={rows} />
              ) : (
                <BarRows rows={rows.map((row) => ({ key: row.optionValue, label: row.optionLabel, value: row.percentage, count: row.count }))} />
              )}
            </section>
          ))}
        </div>
      ) : (
        <EmptyState title="문항별 응답 분포가 없습니다." description="검색어를 지우거나 조건을 줄여보세요." />
      )}
    </AnalysisCard>
  );
}

function ChoiceMatrixDistributionTable(props: { questionTitle: string; rows: ChoiceDistribution[] }) {
  const matrixRows = uniqueMatrixAxis(props.rows, "row");
  const matrixColumns = uniqueMatrixAxis(props.rows, "column");
  const countMax = Math.max(1, ...props.rows.map((row) => row.count));
  const cellByKey = new Map(props.rows.map((row) => [`${row.rowValue ?? ""}:${row.columnValue ?? ""}`, row] as const));

  return (
    <div className="tg-analysis-choice-matrix-wrap">
      <table className="tg-analysis-choice-matrix" aria-label={`${props.questionTitle} 행/열 응답 분포`}>
        <thead>
          <tr>
            <th scope="col">행</th>
            {matrixColumns.map((column) => (
              <th key={column.value} scope="col">
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrixRows.map((row) => (
            <tr key={row.value}>
              <th scope="row">{row.label}</th>
              {matrixColumns.map((column) => {
                const cell = cellByKey.get(`${row.value}:${column.value}`);
                return (
                  <td key={`${row.value}:${column.value}`}>
                    <div className="tg-analysis-choice-matrix__cell">
                      <strong>{(cell?.count ?? 0).toLocaleString("ko-KR")}건</strong>
                      <span>{formatPercent(cell?.percentage ?? 0)}</span>
                      <i>
                        <b style={{ width: `${Math.min(100, Math.max(0, ((cell?.count ?? 0) / countMax) * 100))}%` }} />
                      </i>
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function GroupCompareCard(props: {
  surveyId: string;
  rows: GroupCompareResult[];
  filters: AnalysisFilters;
  groupBy: GroupCompareDimension;
  targetValue: string;
  targetOptions: GroupCompareTargetOption[];
  fields: Array<ProfileFilterDefinition & { key: GroupCompareDimension }>;
  onGroupByChange: (groupBy: GroupCompareDimension) => void;
  onTargetValueChange: (value: string) => void;
}) {
  return (
    <AnalysisCard
      surveyId={props.surveyId}
      captureKey={`group-compare-${props.groupBy}`}
      title="그룹별 비교"
      icon={<GitBranch size={16} aria-hidden="true" />}
      meta={formatFilterSummary(props.filters)}
      action={
        <div className="tg-analysis-group-controls">
          <label className="tg-analysis-inline-select">
            <span>나눠 볼 기준</span>
            <select
              value={props.groupBy}
              disabled={!props.fields.length}
              onChange={(event) => props.onGroupByChange(event.target.value as GroupCompareDimension)}
            >
              {props.fields.length ? (
                props.fields.map((field) => (
                  <option key={field.key} value={field.key}>
                    {field.label}
                  </option>
                ))
              ) : (
                <option value={props.groupBy}>나눌 기준 없음</option>
              )}
            </select>
          </label>
          <label className="tg-analysis-inline-select tg-analysis-inline-select--wide">
            <span>비교할 항목</span>
            <select value={props.targetValue} onChange={(event) => props.onTargetValueChange(event.target.value)}>
              {props.targetOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      }
    >
      {props.fields.length ? (
        <ScoreList
          emptyTitle="그룹별 비교 데이터가 없습니다."
          rows={props.rows.map((row) => ({
            key: row.groupKey,
            label: row.groupLabel,
            score: row.averageScore,
            n: row.n,
            tone: row.isLowest ? "warning" : row.isHighest ? "success" : undefined,
            badges: [
              row.isHighest ? { label: "최고", tone: "success" as const } : undefined,
              row.isLowest ? { label: "최저", tone: "warning" as const } : undefined,
              row.isLowSample ? { label: "해석 주의", tone: "warning" as const } : undefined,
            ].filter((badge): badge is { label: string; tone: "warning" | "success" } => Boolean(badge)),
          }))}
        />
      ) : (
        <EmptyState title="그룹을 나눌 기준이 없습니다." description="선택형 기본 정보 질문을 추가하면 비교할 수 있습니다." />
      )}
    </AnalysisCard>
  );
}

export function TextEvidenceCard(props: {
  surveyId: string;
  captureKey?: string;
  title?: string;
  answers: TextAnswer[];
  detailAnswers?: TextAnswer[];
  questions?: readonly Question[];
  sections?: readonly SurveySection[];
  filters: AnalysisFilters;
  selectedQuestionKey?: string;
  keyword?: string;
  onKeywordChange?: (keyword: string) => void;
  onSelectedQuestionKeyChange?: (questionKey: string) => void;
  emptyTitle?: string;
  emptyDescription?: string;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  detailHasMore?: boolean;
  detailIsLoadingMore?: boolean;
  isExporting?: boolean;
  exportLabel?: string;
  onLoadMore?: () => void;
  onDetailLoadMore?: () => void;
  onExport?: () => void;
}) {
  const [localSelectedQuestionKey, setLocalSelectedQuestionKey] = useState("all");
  const selectedQuestionKey = props.selectedQuestionKey ?? localSelectedQuestionKey;
  const setSelectedQuestionKey = (questionKey: string) => {
    if (props.selectedQuestionKey === undefined) {
      setLocalSelectedQuestionKey(questionKey);
    }
    props.onSelectedQuestionKeyChange?.(questionKey);
  };
  const questionGroups = useMemo(
    () => buildTextAnswerQuestionGroups(props.answers, props.questions ?? [], props.sections ?? []),
    [props.answers, props.questions, props.sections],
  );
  const activeQuestionKey =
    selectedQuestionKey === "all" || questionGroups.some((group) => group.key === selectedQuestionKey) ? selectedQuestionKey : "all";
  const selectedGroup = activeQuestionKey === "all" ? undefined : questionGroups.find((group) => group.key === activeQuestionKey);
  const visibleAnswers = selectedGroup ? props.detailAnswers ?? selectedGroup.answers : props.answers;
  const totalAnswerCount = getKnownMaxCount(props.answers.map((answer) => answer.totalCount));
  const selectedTotalCount = selectedGroup?.totalCount ?? totalAnswerCount;
  const answerGroupById = useMemo(() => {
    const groupsByAnswerId = new Map<string, TextAnswerQuestionGroup>();
    for (const group of questionGroups) {
      group.answers.forEach((answer) => groupsByAnswerId.set(answer.id, group));
    }
    return groupsByAnswerId;
  }, [questionGroups]);
  const answerSections = useMemo(
    () =>
      selectedGroup
        ? [buildTextAnswerDisplaySection({ ...selectedGroup, answers: visibleAnswers })]
        : questionGroups.map((group) => buildTextAnswerDisplaySection(group)),
    [questionGroups, selectedGroup, visibleAnswers],
  );
  const activeHasMore = selectedGroup ? Boolean(props.detailHasMore) : Boolean(props.hasMore);
  const activeIsLoadingMore = selectedGroup ? Boolean(props.detailIsLoadingMore) : Boolean(props.isLoadingMore);
  const activeLoadMore = selectedGroup ? props.onDetailLoadMore : props.onLoadMore;
  const detailHeadingId = `${props.captureKey ?? "text-evidence"}-selected-question`;
  const hasActions = Boolean(props.onKeywordChange || props.onExport);

  return (
    <AnalysisCard
      surveyId={props.surveyId}
      captureKey={props.captureKey ?? "text-evidence"}
      title={props.title ?? "서술형 의견"}
      icon={<FileText size={16} aria-hidden="true" />}
      meta={formatFilterSummary(props.filters)}
      className="tg-analysis-card--wide"
      action={
        hasActions ? (
          <div className="tg-analysis-card-controls">
            {props.onKeywordChange ? (
              <label className="tg-analysis-search">
                <span>검색</span>
                <input value={props.keyword ?? ""} placeholder="찾을 단어" onChange={(event) => props.onKeywordChange?.(event.target.value)} />
              </label>
            ) : null}
            {props.onExport ? (
              <Button
                variant="secondary"
                icon={<Download size={15} aria-hidden="true" />}
                onClick={props.onExport}
                disabled={props.isExporting || !props.answers.length}
              >
                {props.isExporting ? "내보내는 중" : props.exportLabel ?? "Excel 내보내기"}
              </Button>
            ) : null}
          </div>
        ) : undefined
      }
    >
      {props.answers.length ? (
        <div className="tg-analysis-text-workbench">
          <nav className="tg-analysis-text-question-list" aria-label={`${props.title ?? "서술형 의견"} 질문 목록`}>
            <button
              type="button"
              className={activeQuestionKey === "all" ? "tg-analysis-text-question-list__item--active" : ""}
              onClick={() => setSelectedQuestionKey("all")}
            >
              <span>
                <strong>전체 질문</strong>
                <small>질문 {questionGroups.length.toLocaleString("ko-KR")}개</small>
              </span>
              <StatusBadge tone="info">{formatEvidenceCount(totalAnswerCount, props.answers.length)}</StatusBadge>
            </button>
            {questionGroups.map((group) => (
              <button
                key={group.key}
                type="button"
                className={activeQuestionKey === group.key ? "tg-analysis-text-question-list__item--active" : ""}
                onClick={() => setSelectedQuestionKey(group.key)}
              >
                <span>
                  <strong>{getTextAnswerGroupDisplayTitle(group)}</strong>
                  <small>{getTextAnswerGroupContext(group)}</small>
                </span>
                <StatusBadge tone={getCountTone(group.totalCount ?? group.answers.length)}>
                  {formatEvidenceCount(group.totalCount, group.answers.length)}
                </StatusBadge>
              </button>
            ))}
          </nav>
          <section className="tg-analysis-text-detail" aria-labelledby={detailHeadingId}>
            <header className="tg-analysis-text-detail__header">
              <div>
                <h3 id={detailHeadingId}>{selectedGroup ? getTextAnswerGroupDisplayTitle(selectedGroup) : "전체 질문"}</h3>
                <p>
                  {selectedGroup ? `${getTextAnswerGroupContext(selectedGroup)} · ` : ""}
                  {formatEvidenceSummary(selectedTotalCount, visibleAnswers.length)}
                </p>
              </div>
              <StatusBadge tone={getCountTone(selectedTotalCount ?? visibleAnswers.length)}>
                응답 {formatEvidenceCount(selectedTotalCount, visibleAnswers.length)}
              </StatusBadge>
            </header>
            <ul className="tg-analysis-text-answer-list">
              {answerSections.map((section) => (
                <li key={section.key} className="tg-analysis-text-answer-section">
                  {selectedGroup ? null : <strong className="tg-analysis-text-answer-section__title">{section.title}</strong>}
                  <div className="tg-analysis-text-category-groups">
                    {section.categoryGroups.map((categoryGroup) => {
                      const showCategoryHeader = categoryGroup.key !== uncategorizedTextAnswerCategoryKey || section.categoryGroups.length > 1;
                      return (
                        <section key={categoryGroup.key} className="tg-analysis-text-category-group">
                          {showCategoryHeader ? (
                            <header className="tg-analysis-text-category-group__header">
                              <strong>{categoryGroup.label}</strong>
                              <StatusBadge tone={getCountTone(categoryGroup.answers.length)}>{categoryGroup.answers.length.toLocaleString("ko-KR")}개</StatusBadge>
                            </header>
                          ) : null}
                          <ul className="tg-analysis-text-answer-items">
                            {categoryGroup.answers.map((answer) => {
                              const group = answerGroupById.get(answer.id);
                              return (
                                <li key={answer.id}>
                                  {selectedGroup || showCategoryHeader ? null : <strong>{group ? getTextAnswerGroupPath(group) : "질문 미분류"}</strong>}
                                  <p>{answer.textValue}</p>
                                  <div className="tg-analysis-text-answer-list__meta">
                                    <span>{formatProfile(answer.profile)}</span>
                                    <span>{formatDateTime(answer.createdAt)}</span>
                                    {answer.topicKey || answer.spaceKey ? <span>{answer.topicKey ?? answer.spaceKey}</span> : null}
                                  </div>
                                </li>
                              );
                            })}
                          </ul>
                        </section>
                      );
                    })}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>
      ) : (
        <EmptyState
          title={props.emptyTitle ?? "서술형 의견이 없습니다."}
          description={props.emptyDescription ?? "검색어를 지우거나 조건을 줄여보세요."}
        />
      )}
      {activeHasMore ? (
        <div className="tg-analysis-load-more">
          <Button variant="secondary" onClick={activeLoadMore} disabled={activeIsLoadingMore}>
            {activeIsLoadingMore ? "불러오는 중" : "더 보기"}
          </Button>
        </div>
      ) : null}
    </AnalysisCard>
  );
}

type TextAnswerQuestionGroup = Readonly<{
  key: string;
  questionTitle: string;
  parentQuestionTitle?: string;
  sectionTitle?: string;
  topicLabel?: string;
  sectionOrder: number;
  questionOrder: number;
  followUpQuestionOrder: number;
  isScaleLowScoreFollowUp: boolean;
  categoryLabels: ReadonlyMap<string, string>;
  categoryOrders: ReadonlyMap<string, number>;
  totalCount?: number;
  answers: TextAnswer[];
}>;

type TextAnswerDisplaySection = Readonly<{
  key: string;
  title: string;
  categoryGroups: TextAnswerCategoryGroup[];
}>;

type TextAnswerCategoryGroup = Readonly<{
  key: string;
  label: string;
  order: number;
  answers: TextAnswer[];
}>;

const uncategorizedTextAnswerCategoryKey = "__uncategorized__";

function buildTextAnswerQuestionGroups(
  answers: readonly TextAnswer[],
  questions: readonly Question[],
  sections: readonly SurveySection[],
): TextAnswerQuestionGroup[] {
  const questionById = new Map(questions.map((question) => [question.id, question] as const));
  const questionByLookupKey = new Map<string, Question>();
  for (const question of questions) {
    questionByLookupKey.set(question.id, question);
    questionByLookupKey.set(question.questionKey, question);
  }
  const sectionById = new Map(sections.map((section) => [section.id, section] as const));
  const groups = new Map<string, TextAnswerQuestionGroup>();

  for (const answer of answers) {
    const question = answer.questionId ? questionById.get(answer.questionId) : undefined;
    const parentQuestion = question ? resolveFollowUpParentQuestion(question, questionByLookupKey) : undefined;
    const section = answer.sectionId ? sectionById.get(answer.sectionId) : undefined;
    const topicLabel = answer.topicKey ?? answer.spaceKey;
    const key = answer.questionId ?? `${answer.sectionId ?? "section"}:${topicLabel ?? "unclassified"}`;
    const existing = groups.get(key);
    if (existing) {
      groups.set(key, {
        ...existing,
        isScaleLowScoreFollowUp: existing.isScaleLowScoreFollowUp || isScaleLowScoreFollowUpAnswer(answer),
        totalCount: getKnownMaxCount([existing.totalCount, answer.questionTotalCount]),
        answers: [...existing.answers, answer],
      });
      continue;
    }

    const categoryMetadata = question ? buildChoiceTextCategoryMetadata(question) : { labels: new Map<string, string>(), orders: new Map<string, number>() };
    groups.set(key, {
      key,
      questionTitle: answer.questionTitle ?? (question ? formatLocalizedText(question.title, question.questionKey) : undefined) ?? topicLabel ?? "질문 미분류",
      parentQuestionTitle: parentQuestion ? formatLocalizedText(parentQuestion.title, parentQuestion.questionKey) : undefined,
      sectionTitle: answer.sectionTitle ?? (section ? formatLocalizedText(section.title, section.sectionKey) : undefined),
      topicLabel,
      sectionOrder: section?.orderIndex ?? Number.MAX_SAFE_INTEGER,
      questionOrder: parentQuestion?.orderIndex ?? question?.orderIndex ?? Number.MAX_SAFE_INTEGER,
      followUpQuestionOrder: question?.orderIndex ?? Number.MAX_SAFE_INTEGER,
      isScaleLowScoreFollowUp: isScaleLowScoreFollowUpAnswer(answer),
      categoryLabels: categoryMetadata.labels,
      categoryOrders: categoryMetadata.orders,
      totalCount: answer.questionTotalCount,
      answers: [answer],
    });
  }

  return [...groups.values()].sort(
    (a, b) =>
      a.sectionOrder - b.sectionOrder ||
      a.questionOrder - b.questionOrder ||
      a.followUpQuestionOrder - b.followUpQuestionOrder ||
      a.questionTitle.localeCompare(b.questionTitle, "ko"),
  );
}

function formatLocalizedText(title: { ko?: string; en?: string }, fallback: string): string {
  return title.ko?.trim() || title.en?.trim() || fallback;
}

function buildTextAnswerDisplaySection(group: TextAnswerQuestionGroup): TextAnswerDisplaySection {
  return {
    key: group.key,
    title: getTextAnswerGroupPath(group),
    categoryGroups: buildTextAnswerCategoryGroups(group),
  };
}

function buildTextAnswerCategoryGroups(group: TextAnswerQuestionGroup): TextAnswerCategoryGroup[] {
  const groups = new Map<string, TextAnswerCategoryGroup>();
  for (const answer of group.answers) {
    const category = getTextAnswerCategory(answer, group);
    const existing = groups.get(category.key);
    if (existing) {
      groups.set(category.key, { ...existing, answers: [...existing.answers, answer] });
      continue;
    }
    groups.set(category.key, { ...category, answers: [answer] });
  }

  return [...groups.values()].sort((a, b) => a.order - b.order || a.label.localeCompare(b.label, "ko"));
}

function getTextAnswerCategory(
  answer: TextAnswer,
  group: TextAnswerQuestionGroup,
): Omit<TextAnswerCategoryGroup, "answers"> {
  const value = getTextAnswerCategoryValue(answer);
  if (!value) {
    return { key: uncategorizedTextAnswerCategoryKey, label: "카테고리 없음", order: Number.MAX_SAFE_INTEGER };
  }
  const normalizedValue = normalizeTextAnswerCategory(value);
  const configuredLabel = group.categoryLabels.get(value) ?? group.categoryLabels.get(normalizedValue);
  return {
    key: value,
    label: getGeneralizedLowScoreCategoryLabel(value) ?? configuredLabel ?? value,
    order: group.categoryOrders.get(value) ?? getDefaultLowScoreCategoryOrder(value),
  };
}

function getTextAnswerCategoryValue(answer: TextAnswer): string | undefined {
  return (
    getNonEmptyString(answer.valueJson.category) ??
    getNonEmptyString(answer.valueJson.low_score_reason) ??
    getNonEmptyString(answer.valueJson.lowScoreReason) ??
    getNonEmptyString(answer.valueJson.issue_type) ??
    getNonEmptyString(answer.valueJson.issueType) ??
    getNonEmptyString(answer.valueJson.choiceValue) ??
    getNonEmptyString(answer.valueJson.choice_value)
  );
}

function buildChoiceTextCategoryMetadata(question: Question): {
  labels: Map<string, string>;
  orders: Map<string, number>;
} {
  const labels = new Map<string, string>();
  const orders = new Map<string, number>();
  getChoiceOptions(question).forEach((option, index) => {
    const label = option.labelKo || option.labelEn || option.value;
    labels.set(option.value, label);
    labels.set(normalizeTextAnswerCategory(option.value), label);
    orders.set(option.value, index);
    orders.set(normalizeTextAnswerCategory(option.value), index);
    if (option.labelKo) labels.set(option.labelKo, label);
    if (option.labelEn) labels.set(option.labelEn, label);
  });
  return { labels, orders };
}

function getDefaultLowScoreCategoryOrder(value: string): number {
  const normalizedValue = normalizeTextAnswerCategory(value);
  const index = lowScoreCategoryDefinitions.findIndex((definition) => definition.matches.some((match) => normalizedValue === match));
  return index === -1 ? Number.MAX_SAFE_INTEGER - 1 : index;
}

const lowScoreCategoryDefinitions = [
  {
    label: "수량 부족",
    matches: ["not enough quantity", "not enough supplies", "insufficient quantity", "insufficient supplies", "lack of quantity", "lack of supplies", "shortage", "quantity"],
    keywords: ["quantity", "supplies", "supply", "amount", "availability", "available", "shortage"],
  },
  {
    label: "상태/품질 문제",
    matches: ["poor condition", "low quality", "poor quality", "bad condition", "facility condition", "condition", "quality"],
    keywords: ["condition", "quality", "broken", "damage", "damaged", "dirty", "cleanliness", "hygiene", "maintenance"],
  },
  {
    label: "이용 불편",
    matches: ["difficult to use", "hard to use", "difficult use", "usage difficulty", "usability", "ease of use", "inconvenient", "accessibility"],
    keywords: ["difficult", "hard", "use", "usage", "usability", "inconvenient", "access", "accessibility"],
  },
  {
    label: "안내 부족",
    matches: ["not enough guidance", "insufficient guidance", "lack of guidance", "no guidance", "guidance"],
    keywords: ["guidance", "guide", "rule", "rules", "instruction", "instructions", "information", "notice"],
  },
  {
    label: "기타",
    matches: ["other", "etc", "기타"],
    keywords: ["other", "etc"],
  },
] as const;

function getGeneralizedLowScoreCategoryLabel(value: string): string | undefined {
  const normalizedValue = normalizeTextAnswerCategory(value);
  const exactDefinition = lowScoreCategoryDefinitions.find((definition) => definition.matches.some((match) => normalizedValue === match));
  if (exactDefinition) return exactDefinition.label;

  const keywordDefinition = lowScoreCategoryDefinitions.find((definition) => definition.keywords.some((keyword) => normalizedValue.includes(keyword)));
  return keywordDefinition?.label;
}

function normalizeTextAnswerCategory(value: string): string {
  return value.trim().replace(/[_-]+/g, " ").replace(/\s+/g, " ").toLowerCase();
}

function getTextAnswerGroupDisplayTitle(group: TextAnswerQuestionGroup): string {
  return group.parentQuestionTitle ?? group.questionTitle;
}

function getTextAnswerGroupContext(group: TextAnswerQuestionGroup): string {
  if (group.isScaleLowScoreFollowUp) {
    return "후속 답변 · 선택 카테고리 포함";
  }
  if (group.parentQuestionTitle) {
    return `후속 답변 · ${group.questionTitle}`;
  }
  return group.sectionTitle ?? group.topicLabel ?? "미분류";
}

function getTextAnswerGroupPath(group: TextAnswerQuestionGroup): string {
  if (group.isScaleLowScoreFollowUp) {
    return `${group.questionTitle} -> 낮은 점수 후속 답변`;
  }
  return group.parentQuestionTitle ? `${group.parentQuestionTitle} -> ${group.questionTitle}` : group.questionTitle;
}

function isScaleLowScoreFollowUpAnswer(answer: TextAnswer): boolean {
  return answer.valueJson.lowScoreFollowUp === true || answer.valueJson.low_score_followup === true;
}

function resolveFollowUpParentQuestion(question: Question, questionByLookupKey: ReadonlyMap<string, Question>): Question | undefined {
  for (const sourceKey of getFollowUpSourceQuestionKeys(question.config)) {
    const parentQuestion = questionByLookupKey.get(sourceKey);
    if (parentQuestion && parentQuestion.id !== question.id) {
      return parentQuestion;
    }
  }
  return undefined;
}

function getFollowUpSourceQuestionKeys(config: unknown): string[] {
  const configRecord = asUnknownRecord(config);
  if (!configRecord) return [];
  const branch = asUnknownRecord(configRecord.branch);
  const visibility = asUnknownRecord(configRecord.visibility);
  const candidates = [
    branch?.when,
    visibility?.when,
    Array.isArray(branch?.rules) ? branch.rules : undefined,
    Array.isArray(visibility?.rules) ? visibility.rules : undefined,
    configRecord.visibleWhen,
    configRecord.visible_when,
    configRecord.condition,
    configRecord.dependsOn,
    configRecord.depends_on,
  ];
  return candidates.flatMap((candidate) => getFollowUpSourceKeysFromRule(candidate));
}

function getFollowUpSourceKeysFromRule(rule: unknown): string[] {
  if (Array.isArray(rule)) {
    return rule.flatMap((item) => getFollowUpSourceKeysFromRule(item));
  }

  const record = asUnknownRecord(rule);
  if (!record) return [];

  return [
    getNonEmptyString(record.questionId),
    getNonEmptyString(record.question_id),
    getNonEmptyString(record.sourceQuestionId),
    getNonEmptyString(record.source_question_id),
    getNonEmptyString(record.questionKey),
    getNonEmptyString(record.question_key),
    getNonEmptyString(record.sourceQuestionKey),
    getNonEmptyString(record.source_question_key),
  ].filter((value): value is string => Boolean(value));
}

function asUnknownRecord(value: unknown): Readonly<Record<string, unknown>> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Readonly<Record<string, unknown>>) : undefined;
}

function getNonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function getKnownMaxCount(values: Array<number | undefined>): number | undefined {
  const counts = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  return counts.length ? Math.max(...counts) : undefined;
}

function formatEvidenceCount(totalCount: number | undefined, loadedCount: number): string {
  return totalCount === undefined ? `표시 ${loadedCount.toLocaleString("ko-KR")}개` : `${totalCount.toLocaleString("ko-KR")}개`;
}

function formatEvidenceSummary(totalCount: number | undefined, loadedCount: number): string {
  return totalCount === undefined
    ? `표시 중 ${loadedCount.toLocaleString("ko-KR")}개`
    : `표시 중 ${loadedCount.toLocaleString("ko-KR")}개 / 전체 ${totalCount.toLocaleString("ko-KR")}개`;
}

function getCountTone(count: number): "warning" | "info" {
  return count > 0 && count < lowSampleThreshold ? "warning" : "info";
}

export function HeatmapPointCard(props: { surveyId: string; points: HeatmapPoint[]; filters: AnalysisFilters }) {
  return (
    <AnalysisCard
      surveyId={props.surveyId}
      captureKey="heatmap-points"
      title="사진 표시 위치"
      icon={<MapPinned size={16} aria-hidden="true" />}
      meta={formatFilterSummary(props.filters)}
    >
      {props.points.length ? (
        <div className="tg-analysis-heatmap-mini" aria-label="사진 표시 위치">
          {props.points.map((point, index) => (
            <i key={point.id ?? index} style={{ left: `${point.xRatio * 100}%`, top: `${point.yRatio * 100}%` }} title={point.textValue ?? point.tagType ?? "표시"} />
          ))}
        </div>
      ) : (
        <EmptyState title="사진에 표시된 위치가 없습니다." description="사진 위에 표시한 응답이 있으면 위치가 표시됩니다." />
      )}
    </AnalysisCard>
  );
}

function AnalysisCard(props: {
  surveyId: string;
  captureKey: string;
  title: string;
  icon: ReactNode;
  meta?: string;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  const captureRef = useRef<HTMLDivElement>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const filename = `taglow-${props.surveyId}-${props.captureKey}-${new Date().toISOString().replace(/[:.]/g, "-")}.png`;

  return (
    <article className={props.className ? `tg-analysis-card ${props.className}` : "tg-analysis-card"}>
      <header className="tg-analysis-card__header">
        <div>
          <span>{props.icon}</span>
          <div>
            <h2>{props.title}</h2>
            {props.meta ? <p>{props.meta}</p> : null}
          </div>
        </div>
        <div className="tg-analysis-card__actions">
          {props.action}
          <Button
            variant="ghost"
            icon={<Download size={15} aria-hidden="true" />}
            disabled={isCapturing}
            onClick={async () => {
              if (!captureRef.current) return;
              setIsCapturing(true);
              try {
                await downloadElementAsPng(captureRef.current, filename);
              } finally {
                setIsCapturing(false);
              }
            }}
          >
            이미지 저장
          </Button>
        </div>
      </header>
      <div ref={captureRef} className="tg-analysis-card__body">
        {props.children}
      </div>
    </article>
  );
}

function Metric(props: { label: string; value: string; tone?: "warning" }) {
  return (
    <div className={`tg-analysis-metric ${props.tone ? `tg-analysis-metric--${props.tone}` : ""}`}>
      <span>{props.label}</span>
      <strong>{props.value}</strong>
    </div>
  );
}

function DistributionBlock(props: { title: string; items: ReadonlyArray<DistributionItem>; isFiltered: boolean }) {
  const items = (props.isFiltered ? props.items.filter((item) => item.n > 0) : props.items).filter((item) => item.n > 0);
  const total = items.reduce((sum, item) => sum + item.n, 0);
  return (
    <section className="tg-analysis-distribution-block">
      <h3>{props.title}</h3>
      {items.length && total > 0 ? (
        <div className="tg-analysis-pie-block">
          <div
            className="tg-analysis-pie"
            role="img"
            aria-label={`${props.title} 응답 비율: ${items.map((item) => `${item.label} ${formatPercent(item.percentage)}`).join(", ")}`}
            style={{ "--tg-pie-gradient": buildPieGradient(items) } as CSSProperties}
          >
            <span>
              <strong>{total.toLocaleString("ko-KR")}</strong>
              <small>응답</small>
            </span>
          </div>
          <ul className="tg-analysis-pie-legend">
            {items.map((item, index) => (
              <li key={item.key}>
                <i style={{ background: getPieColor(index) }} aria-hidden="true" />
                <span>{item.label}</span>
                <strong>{formatPercent(item.percentage)}</strong>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="tg-analysis-muted">선택한 조건에 해당하는 응답이 없습니다.</p>
      )}
    </section>
  );
}

function ScoreList(props: {
  emptyTitle: string;
  rows: Array<{
    key: string;
    label: string;
    score: number | null;
    n: number;
    tone?: "warning" | "success";
    badges?: Array<{ label: string; tone: "warning" | "success" | "info" }>;
  }>;
}) {
  const maxScore = 5;
  if (!props.rows.length) return <EmptyState title={props.emptyTitle} description="조건을 줄이거나 응답 수집 후 다시 확인해주세요." />;
  return (
    <ol className="tg-analysis-score-list">
      {props.rows.slice(0, 12).map((row) => (
        <li key={row.key}>
          <div>
            <strong>{row.label}</strong>
            <small>응답 수 {row.n}명</small>
            {row.badges?.length ? (
              <span className="tg-analysis-score-list__badges" aria-label={`${row.label} 상태`}>
                {row.badges.map((badge) => (
                  <StatusBadge key={`${row.key}:${badge.label}`} tone={badge.tone}>
                    {badge.label}
                  </StatusBadge>
                ))}
              </span>
            ) : null}
          </div>
          <span className="tg-analysis-score-list__bar">
            <i style={{ width: `${Math.min(100, Math.max(0, ((row.score ?? 0) / maxScore) * 100))}%` }} />
          </span>
          <StatusBadge tone={row.n > 0 && row.n < lowSampleThreshold ? "warning" : row.tone ?? "info"}>{formatScore(row.score)}</StatusBadge>
        </li>
      ))}
    </ol>
  );
}

function BarRows(props: { rows: Array<{ key: string; label: string; value: number; count: number }> }) {
  return (
    <div className="tg-analysis-bar-rows">
      {props.rows.map((row) => (
        <div key={row.key} className="tg-analysis-bar-row">
          <span>{row.label}</span>
          <i>
            <b style={{ width: `${Math.min(100, Math.max(0, row.value))}%` }} />
          </i>
          <strong>{formatPercent(row.value)}</strong>
        </div>
      ))}
    </div>
  );
}

function hasMatrixDistribution(rows: readonly ChoiceDistribution[]): boolean {
  return rows.some((row) => Boolean(row.rowValue && row.columnValue));
}

function uniqueMatrixAxis(rows: readonly ChoiceDistribution[], axis: "row" | "column"): Array<{ value: string; label: string; order: number }> {
  const items = new Map<string, { value: string; label: string; order: number }>();
  for (const row of rows) {
    const value = axis === "row" ? row.rowValue : row.columnValue;
    if (!value) continue;
    const label = (axis === "row" ? row.rowLabel : row.columnLabel) ?? value;
    const order = axis === "row" ? row.rowOrder : row.columnOrder;
    items.set(value, { value, label, order: order ?? Number.MAX_SAFE_INTEGER });
  }
  return [...items.values()].sort((a, b) => a.order - b.order || a.label.localeCompare(b.label, "ko-KR"));
}

function groupBy<T>(items: T[], getKey: (item: T) => string): Array<[string, T[]]> {
  const grouped = new Map<string, T[]>();
  for (const item of items) {
    const key = getKey(item);
    grouped.set(key, [...(grouped.get(key) ?? []), item]);
  }
  return [...grouped.entries()];
}

function buildSectionOptions(items: ReadonlyArray<{ sectionId?: string; sectionTitle?: string }>): Array<{ value: string; label: string }> {
  const options = new Map<string, string>();
  for (const item of items) {
    if (!item.sectionId) continue;
    options.set(item.sectionId, item.sectionTitle ?? "주제 없음");
  }
  return [...options.entries()].map(([value, label]) => ({ value, label }));
}

function normalizeSearchText(value: string): string {
  return value.trim().toLocaleLowerCase("ko-KR");
}

function formatCount(value: number | undefined): string {
  return typeof value === "number" ? value.toLocaleString("ko-KR") : "-";
}

function formatScore(value: number | null | undefined): string {
  return typeof value === "number" && Number.isFinite(value) ? value.toFixed(2) : "-";
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || "-";
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

function buildPieGradient(items: ReadonlyArray<DistributionItem>): string {
  let cursor = 0;
  const stops = items.map((item, index) => {
    const start = cursor;
    const end = Math.min(100, cursor + Math.max(0, item.percentage));
    cursor = end;
    return `${getPieColor(index)} ${start}% ${end}%`;
  });
  if (cursor < 100) {
    stops.push(`var(--tg-bg-inset) ${cursor}% 100%`);
  }
  return `conic-gradient(${stops.join(", ")})`;
}

function getPieColor(index: number): string {
  return pieColors[index % pieColors.length];
}

function formatPrioritySource(value: PriorityIssue["source"]): string {
  if (value === "low_satisfaction") return "낮은 만족도";
  if (value === "text") return "서술형 의견";
  if (value === "heatmap") return "사진 표시";
  return "여러 근거";
}

function formatAnswerType(value: string | undefined): string {
  if (value === "profile") return "기본 정보";
  if (value === "scale") return "점수";
  if (value === "single_choice") return "단일 선택";
  if (value === "multi_select") return "복수 선택";
  if (value === "matrix_multi_select") return "행렬 선택";
  if (value === "ranking") return "순위";
  if (value === "text") return "서술형";
  if (value === "image_tag") return "사진 표시";
  if (value === "participant_image_tag") return "사진 업로드 표시";
  if (value === "attention_check") return "주의력 확인";
  if (value === "experience") return "경험 여부";
  return "답변";
}

function formatFilterSummary(filters: AnalysisFilters): string {
  const count = countActiveFilters(filters);
  return count ? `조건 ${count}개 적용` : "모든 응답 기준";
}

function hasActiveFilters(filters: AnalysisFilters): boolean {
  return countActiveFilters(filters) > 0;
}

function countActiveFilters(filters: AnalysisFilters): number {
  return Object.values(filters).filter((value) => typeof value === "string" && value.trim()).length;
}

function formatProfile(profile: unknown): string {
  if (!profile || typeof profile !== "object" || Array.isArray(profile)) return "기본 정보 없음";
  const record = profile as Record<string, unknown>;
  const values = [record.dormitory, record.roomType, record.rc, record.department].filter(
    (value): value is string => typeof value === "string" && value.trim().length > 0,
  );
  return values.length ? values.join(" · ") : "기본 정보 없음";
}
