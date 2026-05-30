import { AlertTriangle, Download, FileText, GitBranch, Layers3, ListFilter, MapPinned, Target, TrendingUp } from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useRef, useState } from "react";
import type {
  AnalysisFilters,
  BorichResult,
  ChoiceDistribution,
  GroupCompareDimension,
  GroupCompareResult,
  HeatmapPoint,
  LocusPoint,
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

export function ResponseSummaryCard(props: { surveyId: string; summary?: ResponseSummary; filters: AnalysisFilters; fields?: ProfileFilterDefinition[] }) {
  const summary = props.summary;
  const labelByKey = new Map((props.fields ?? []).map((field) => [field.key, field.label] as const));
  const isFiltered = hasActiveFilters(props.filters);
  return (
    <AnalysisCard
      surveyId={props.surveyId}
      captureKey="response-summary"
      title="응답 요약"
      icon={<ListFilter size={16} aria-hidden="true" />}
      meta={formatFilterSummary(props.filters)}
    >
      <div className="tg-analysis-stat-grid">
        <Metric
          label={isFiltered ? "필터 적용 응답" : "제출 완료"}
          value={formatCount(isFiltered ? summary?.filteredResponses : summary?.submittedResponses)}
          tone={summary?.isLowSample ? "warning" : undefined}
        />
        <Metric label={isFiltered ? "제출 완료 전체" : "전체 응답"} value={formatCount(isFiltered ? summary?.submittedResponses : summary?.totalResponses)} />
        <Metric label={isFiltered ? "전체 응답" : "필터 적용 응답"} value={formatCount(isFiltered ? summary?.totalResponses : summary?.filteredResponses)} />
      </div>
      {summary?.isLowSample ? <LowSampleWarning n={summary.filteredResponses} /> : null}
      {summary?.lowSampleGroups.length ? (
        <ul className="tg-analysis-low-list">
          {summary.lowSampleGroups.slice(0, 6).map((group) => (
            <li key={`${group.dimension}:${group.label}`}>
              <span>{labelByKey.get(group.dimension) ?? profileFilterLabels[group.dimension]}</span>
              <strong>{group.label}</strong>
              <StatusBadge tone="warning">N={group.n}</StatusBadge>
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
      title="기본 정보 분포"
      icon={<Layers3 size={16} aria-hidden="true" />}
      meta={`${formatFilterSummary(props.filters)} · 응답 비율`}
    >
      <div className="tg-analysis-distribution-grid">
        {props.fields.length ? (
          props.fields.map((field) => (
            <DistributionBlock key={field.key} title={field.label} items={distribution?.[field.key] ?? []} isFiltered={isFiltered} />
          ))
        ) : (
          <EmptyState title="기본 정보 분포 기준이 없습니다." description="빌더에서 선택형 기본 정보 질문을 추가하면 표시됩니다." />
        )}
      </div>
    </AnalysisCard>
  );
}

export function PriorityTop5Card(props: { surveyId: string; issues: PriorityIssue[]; filters: AnalysisFilters }) {
  return (
    <AnalysisCard
      surveyId={props.surveyId}
      captureKey="priority-top5"
      title="개선 우선순위 TOP 5"
      icon={<TrendingUp size={16} aria-hidden="true" />}
      meta={formatFilterSummary(props.filters)}
    >
      {props.issues.length ? (
        <ol className="tg-analysis-priority-list">
          {props.issues.map((issue, index) => (
            <li key={issue.id}>
              <strong>{index + 1}</strong>
              <div>
                <p>{issue.label}</p>
                <small>
                  만족도 {formatScore(issue.averageSatisfaction)} · 중요도 {formatScore(issue.averageImportance)} · Gap {formatScore(issue.gap)} · N=
                  {issue.n}
                </small>
              </div>
              <StatusBadge tone={issue.n > 0 && issue.n < lowSampleThreshold ? "warning" : "info"}>
                {issue.source === "mixed" ? "종합" : issue.source}
              </StatusBadge>
            </li>
          ))}
        </ol>
      ) : (
        <EmptyState title="우선순위 데이터가 없습니다." description="만족도 또는 중요도 응답이 쌓이면 표시됩니다." />
      )}
    </AnalysisCard>
  );
}

export function SectionAverageCard(props: { surveyId: string; sections: SectionSummary[]; filters: AnalysisFilters }) {
  return (
    <AnalysisCard
      surveyId={props.surveyId}
      captureKey="section-average"
      title="섹션별 만족도"
      icon={<Target size={16} aria-hidden="true" />}
      meta={formatFilterSummary(props.filters)}
    >
      <ScoreList
        emptyTitle="섹션 평균 데이터가 없습니다."
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
  return (
    <AnalysisCard
      surveyId={props.surveyId}
      captureKey="question-average"
      title="질문별 평균/편차"
      icon={<Target size={16} aria-hidden="true" />}
      meta={formatFilterSummary(props.filters)}
    >
      <div className="tg-analysis-table-wrap">
        {props.questions.length ? (
          <table className="tg-analysis-table">
            <thead>
              <tr>
                <th>질문</th>
                <th>섹션</th>
                <th>평균</th>
                <th>편차</th>
                <th>N</th>
              </tr>
            </thead>
            <tbody>
              {props.questions.slice(0, 12).map((question) => (
                <tr key={question.questionId}>
                  <td>{question.questionTitle}</td>
                  <td>{question.sectionTitle ?? "섹션 미지정"}</td>
                  <td>{formatScore(question.averageScore)}</td>
                  <td>{formatScore(question.standardDeviation)}</td>
                  <td>{question.n}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <EmptyState title="질문 평균 데이터가 없습니다." description="척도형 만족도 응답이 있으면 표시됩니다." />
        )}
      </div>
    </AnalysisCard>
  );
}

export function ChoiceDistributionCard(props: { surveyId: string; distributions: ChoiceDistribution[]; filters: AnalysisFilters }) {
  const grouped = useMemo(() => groupBy(props.distributions, (item) => item.questionId), [props.distributions]);
  return (
    <AnalysisCard
      surveyId={props.surveyId}
      captureKey="choice-distribution"
      title="응답 비율 보기"
      icon={<ListFilter size={16} aria-hidden="true" />}
      meta={formatFilterSummary(props.filters)}
    >
      {grouped.length ? (
        <div className="tg-analysis-choice-groups">
          {grouped.slice(0, 4).map(([questionId, rows]) => (
            <section key={questionId} className="tg-analysis-choice-group">
              <h3>{rows[0]?.questionTitle ?? "제목 없는 질문"}</h3>
              <BarRows rows={rows.map((row) => ({ key: row.optionValue, label: row.optionLabel, value: row.percentage, count: row.count }))} />
            </section>
          ))}
        </div>
      ) : (
        <EmptyState title="선택형 응답 데이터가 없습니다." description="선택형 또는 프로필 응답 비율이 표시됩니다." />
      )}
    </AnalysisCard>
  );
}

export function GroupCompareCard(props: {
  surveyId: string;
  rows: GroupCompareResult[];
  filters: AnalysisFilters;
  groupBy: GroupCompareDimension;
  fields: Array<ProfileFilterDefinition & { key: GroupCompareDimension }>;
  onGroupByChange: (groupBy: GroupCompareDimension) => void;
}) {
  return (
    <AnalysisCard
      surveyId={props.surveyId}
      captureKey={`group-compare-${props.groupBy}`}
      title="집단 비교"
      icon={<GitBranch size={16} aria-hidden="true" />}
      meta={formatFilterSummary(props.filters)}
      action={
        <label className="tg-analysis-inline-select">
          <span>비교 기준</span>
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
              <option value={props.groupBy}>기준 없음</option>
            )}
          </select>
        </label>
      }
    >
      {props.fields.length ? (
        <ScoreList
          emptyTitle="집단 비교 데이터가 없습니다."
          rows={props.rows.map((row) => ({
            key: row.groupKey,
            label: row.groupLabel,
            score: row.averageScore,
            n: row.n,
            tone: row.isLowest ? "warning" : row.isHighest ? "success" : undefined,
          }))}
        />
      ) : (
        <EmptyState title="집단 비교 기준이 없습니다." description="빌더에서 선택형 기본 정보 질문을 추가하면 비교할 수 있습니다." />
      )}
    </AnalysisCard>
  );
}

export function BorichCard(props: { surveyId: string; rows: BorichResult[]; filters: AnalysisFilters }) {
  return (
    <AnalysisCard surveyId={props.surveyId} captureKey="borich" title="Borich 요구도" icon={<TrendingUp size={16} aria-hidden="true" />} meta={formatFilterSummary(props.filters)}>
      <AnalysisTable
        emptyTitle="Borich 계산 데이터가 없습니다."
        columns={["항목", "중요도", "만족도", "Gap", "점수", "N"]}
        rows={props.rows.slice(0, 10).map((row) => [
          row.topicKey,
          formatScore(row.averageImportance),
          formatScore(row.averageSatisfaction),
          formatScore(row.gap),
          formatScore(row.borichScore),
          String(row.n),
        ])}
      />
    </AnalysisCard>
  );
}

export function LocusCard(props: { surveyId: string; rows: LocusPoint[]; filters: AnalysisFilters }) {
  const quadrants = [
    ["top_priority", "최우선 개선"],
    ["maintain_strengthen", "유지 강화"],
    ["gradual_improvement", "점진 개선"],
    ["maintain", "현 수준 유지"],
  ] as const;
  return (
    <AnalysisCard surveyId={props.surveyId} captureKey="locus" title="Locus 4분면" icon={<Target size={16} aria-hidden="true" />} meta={formatFilterSummary(props.filters)}>
      {props.rows.length ? (
        <div className="tg-analysis-locus-grid">
          {quadrants.map(([quadrant, label]) => (
            <section key={quadrant}>
              <h3>{label}</h3>
              <ul>
                {props.rows
                  .filter((row) => row.quadrant === quadrant)
                  .slice(0, 8)
                  .map((row) => (
                    <li key={row.topicKey}>
                      <span>{row.label}</span>
                      <small>
                        중요도 {formatScore(row.averageImportance)} · 만족도 {formatScore(row.averageSatisfaction)} · N={row.n}
                      </small>
                    </li>
                  ))}
              </ul>
            </section>
          ))}
        </div>
      ) : (
        <EmptyState title="Locus 데이터가 없습니다." description="중요도와 만족도 쌍이 있어야 계산됩니다." />
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
      title="주관식 의견 묶음"
      icon={<FileText size={16} aria-hidden="true" />}
      meta={formatFilterSummary(props.filters)}
      action={
        <label className="tg-analysis-search">
          <span>검색</span>
          <input value={props.keyword} placeholder="키워드" onChange={(event) => props.onKeywordChange(event.target.value)} />
        </label>
      }
    >
      {props.groups.length ? (
        <div className="tg-analysis-text-grid">
          {props.groups.slice(0, 8).map((group) => (
            <section key={group.groupKey} className="tg-analysis-text-node">
              <header>
                <h3>{group.label}</h3>
                <StatusBadge tone={group.n > 0 && group.n < lowSampleThreshold ? "warning" : "info"}>N={group.n}</StatusBadge>
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
        <EmptyState title="주관식 의견이 없습니다." description="검색어를 지우거나 필터를 완화해보세요." />
      )}

      <div className="tg-analysis-table-wrap">
        <table className="tg-analysis-table">
          <thead>
            <tr>
              <th>원문</th>
              <th>분류</th>
              <th>프로필</th>
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
      title="이미지 태깅 분포"
      icon={<MapPinned size={16} aria-hidden="true" />}
      meta={formatFilterSummary(props.filters)}
    >
      {props.points.length ? (
        <div className="tg-analysis-heatmap-mini" aria-label="이미지 태깅 좌표 분포">
          {props.points.map((point, index) => (
            <i key={point.id ?? index} style={{ left: `${point.xRatio * 100}%`, top: `${point.yRatio * 100}%` }} title={point.textValue ?? point.tagType ?? "태그"} />
          ))}
        </div>
      ) : (
        <EmptyState title="태깅 좌표가 없습니다." description="이미지 태깅 응답이 있으면 위치 분포가 표시됩니다." />
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
  children: ReactNode;
}) {
  const captureRef = useRef<HTMLDivElement>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const filename = `taglow-${props.surveyId}-${props.captureKey}-${new Date().toISOString().replace(/[:.]/g, "-")}.png`;

  return (
    <article className="tg-analysis-card">
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
            PNG
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
      <span>N={props.n}라 해석에 주의가 필요합니다.</span>
    </div>
  );
}

function DistributionBlock(props: { title: string; items: ReadonlyArray<{ key: string; label: string; n: number; percentage: number }>; isFiltered: boolean }) {
  const items = props.isFiltered ? props.items.filter((item) => item.n > 0) : props.items;
  return (
    <section className="tg-analysis-distribution-block">
      <h3>{props.title}</h3>
      {items.length ? (
        <BarRows rows={items.map((item) => ({ key: item.key, label: item.label, value: item.percentage, count: item.n }))} />
      ) : (
        <p className="tg-analysis-muted">필터 조건에 해당하는 응답이 없습니다.</p>
      )}
    </section>
  );
}

function ScoreList(props: { emptyTitle: string; rows: Array<{ key: string; label: string; score: number | null; n: number; tone?: "warning" | "success" }> }) {
  const maxScore = 5;
  if (!props.rows.length) return <EmptyState title={props.emptyTitle} description="필터를 완화하거나 응답 수집 후 다시 확인해주세요." />;
  return (
    <ol className="tg-analysis-score-list">
      {props.rows.slice(0, 12).map((row) => (
        <li key={row.key}>
          <div>
            <strong>{row.label}</strong>
            <small>N={row.n}</small>
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
          <strong>
            {row.count} · {formatPercent(row.value)}
          </strong>
        </div>
      ))}
    </div>
  );
}

function AnalysisTable(props: { emptyTitle: string; columns: string[]; rows: string[][] }) {
  if (!props.rows.length) return <EmptyState title={props.emptyTitle} description="필터를 완화하거나 응답 수집 후 다시 확인해주세요." />;
  return (
    <div className="tg-analysis-table-wrap">
      <table className="tg-analysis-table">
        <thead>
          <tr>
            {props.columns.map((column) => (
              <th key={column}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {props.rows.map((row, index) => (
            <tr key={index}>
              {row.map((cell, cellIndex) => (
                <td key={cellIndex}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
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

function formatCount(value: number | undefined): string {
  return typeof value === "number" ? value.toLocaleString("ko-KR") : "-";
}

function formatScore(value: number | null | undefined): string {
  return typeof value === "number" && Number.isFinite(value) ? value.toFixed(2) : "-";
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

function formatFilterSummary(filters: AnalysisFilters): string {
  const count = countActiveFilters(filters);
  return count ? `필터 ${count}개 적용` : "전체 응답 기준";
}

function hasActiveFilters(filters: AnalysisFilters): boolean {
  return countActiveFilters(filters) > 0;
}

function countActiveFilters(filters: AnalysisFilters): number {
  return Object.values(filters).filter((value) => typeof value === "string" && value.trim()).length;
}

function formatProfile(profile: unknown): string {
  if (!profile || typeof profile !== "object" || Array.isArray(profile)) return "프로필 없음";
  const record = profile as Record<string, unknown>;
  const values = [record.dormitory, record.roomType, record.rc, record.department].filter(
    (value): value is string => typeof value === "string" && value.trim().length > 0,
  );
  return values.length ? values.join(" · ") : "프로필 없음";
}
