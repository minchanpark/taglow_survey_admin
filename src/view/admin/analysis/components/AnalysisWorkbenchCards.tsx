import { AlertTriangle, Download, FileText, GitBranch, Layers3, ListFilter, MapPinned, Target, TrendingUp } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { useMemo, useRef, useState } from "react";
import type {
  AnalysisFilters,
  ChoiceDistribution,
  GroupCompareDimension,
  GroupCompareResult,
  HeatmapPoint,
  PriorityIssue,
  ProfileDistribution,
  ProfileFilterDefinition,
  QuestionSummary,
  ResponseSummary,
  SectionSummary,
  TextAnswer,
  TextGroup,
} from "../../../../api/admin/model";
import { profileFilterLabels } from "../../../../api/admin/model";
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

export function ResponseSummaryCard(props: { surveyId: string; summary?: ResponseSummary; filters: AnalysisFilters; fields?: ProfileFilterDefinition[] }) {
  const summary = props.summary;
  const labelByKey = new Map((props.fields ?? []).map((field) => [field.key, field.label] as const));
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
      {summary?.isLowSample ? <LowSampleWarning n={summary.filteredResponses} /> : null}
      {summary?.lowSampleGroups.length ? (
        <ul className="tg-analysis-low-list">
          {summary.lowSampleGroups.slice(0, 6).map((group) => (
            <li key={`${group.dimension}:${group.label}`}>
              <span>{labelByKey.get(group.dimension) ?? profileFilterLabels[group.dimension]}</span>
              <strong>{group.label}</strong>
              <StatusBadge tone="warning">응답 수 {group.n}명</StatusBadge>
            </li>
          ))}
        </ul>
      ) : null}
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
        return normalizeSearchText(`${item.questionTitle} ${item.sectionTitle ?? ""} ${item.optionLabel}`).includes(normalizedKeyword);
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
                  응답 수 {rows[0]?.n ?? 0}명
                </StatusBadge>
              </header>
              <BarRows rows={rows.map((row) => ({ key: row.optionValue, label: row.optionLabel, value: row.percentage, count: row.count }))} />
            </section>
          ))}
        </div>
      ) : (
        <EmptyState title="문항별 응답 분포가 없습니다." description="검색어를 지우거나 조건을 줄여보세요." />
      )}
    </AnalysisCard>
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
  groups: TextGroup[];
  answers: TextAnswer[];
  filters: AnalysisFilters;
  keyword: string;
  onKeywordChange: (keyword: string) => void;
}) {
  return (
    <AnalysisCard
      surveyId={props.surveyId}
      captureKey="text-evidence"
      title="서술형 의견 모음"
      icon={<FileText size={16} aria-hidden="true" />}
      meta={formatFilterSummary(props.filters)}
      action={
        <label className="tg-analysis-search">
          <span>검색</span>
          <input value={props.keyword} placeholder="찾을 단어" onChange={(event) => props.onKeywordChange(event.target.value)} />
        </label>
      }
    >
      {props.groups.length ? (
        <div className="tg-analysis-text-grid">
          {props.groups.slice(0, 8).map((group) => (
            <section key={group.groupKey} className="tg-analysis-text-node">
              <header>
                <h3>{group.label}</h3>
                <StatusBadge tone={group.n > 0 && group.n < lowSampleThreshold ? "warning" : "info"}>응답 수 {group.n}명</StatusBadge>
              </header>
              <ul>
                {group.representativeTexts.map((text, index) => (
                  <li key={`${group.groupKey}-${index}`}>{text}</li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      ) : (
        <EmptyState title="서술형 의견이 없습니다." description="검색어를 지우거나 조건을 줄여보세요." />
      )}

      <div className="tg-analysis-table-wrap">
        <table className="tg-analysis-table">
          <thead>
            <tr>
              <th>의견</th>
              <th>묶음</th>
              <th>기본 정보</th>
            </tr>
          </thead>
          <tbody>
            {props.answers.slice(0, 12).map((answer) => (
              <tr key={answer.id}>
                <td>{answer.textValue}</td>
                <td>{answer.topicKey ?? answer.spaceKey ?? "미분류"}</td>
                <td>{formatProfile(answer.profile)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AnalysisCard>
  );
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

function LowSampleWarning(props: { n: number }) {
  return (
    <div className="tg-analysis-warning">
      <AlertTriangle size={15} aria-hidden="true" />
      <span>응답 수 {props.n}명이라 해석에 주의가 필요합니다.</span>
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
