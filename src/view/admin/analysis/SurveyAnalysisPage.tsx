import { ImageIcon, Upload } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  useChoiceDistributionQuery,
  useFilterOptionsQuery,
  useGroupCompareSummaryQuery,
  useHeatmapPointsQuery,
  useImageTagAnswersInfiniteQuery,
  useIdentityResponsesInfiniteQuery,
  usePriorityTop5Query,
  useQuestionSatisfactionSummaryQuery,
  useResponseSummaryQuery,
  useSectionSatisfactionSummaryQuery,
  useSurveyDetailQuery,
  useTextAnswersInfiniteQuery,
  useTextGroupsQuery,
} from "../../../api/admin/query";
import {
  areAnalysisFiltersEqual,
  buildProfileFilterDefinitions,
  getGroupCompareDefinitions,
  mergeProfileFilterDefinitionsWithOptions,
  pruneAnalysisFilters,
} from "../../../api/admin/model";
import type {
  GroupCompareDimension,
  GroupCompareFilters,
  HeatmapFilters,
  IdentityResponse,
  ImageTagAnswer,
  ImageTagAnswerImage,
  JsonRecord,
  Question,
  SurveySection,
  SurveyAsset,
  TextAnswerFilters,
} from "../../../api/admin/model";
import { ErrorState, LoadingState, StatusBadge } from "../../../components";
import { useAdminFilterStore } from "../../../store";
import {
  ChoiceDistributionCard,
  GroupCompareCard,
  HeatmapPointCard,
  IdentityResponseCard,
  PriorityTop5Card,
  ProfileDistributionCard,
  QuestionAverageCard,
  ResponseSummaryCard,
  SectionAverageCard,
  TextEvidenceCard,
  type GroupCompareTargetOption,
} from "./components/AnalysisWorkbenchCards";
import { GlobalFilterBar } from "./components/GlobalFilterBar";
import { ImageTagAnswerSection, type ImageTagAnswerGroup } from "./components/ImageTagAnswerSection";
import "./css/SurveyAnalysisPage.css";

const devIdentityResponses: IdentityResponse[] = [
  {
    responseId: "dev-identity-response-1",
    studentNumber: "22000123",
    name: "김태글",
    profile: { dormitory: "비전관", roomType: "2인실", rc: "장기려", department: "전산전자공학부" },
    submittedAt: "2026-06-02T09:10:00.000Z",
  },
  {
    responseId: "dev-identity-response-2",
    studentNumber: "22110456",
    name: "이상점",
    profile: { dormitory: "은혜관", roomType: "3인실", rc: "손양원", department: "콘텐츠융합디자인학부" },
    submittedAt: "2026-06-02T09:18:00.000Z",
  },
  {
    responseId: "dev-identity-response-3",
    studentNumber: "21907890",
    name: "박참여",
    profile: { dormitory: "창조관", roomType: "4인실", rc: "토레이", department: "ICT창업학부" },
    submittedAt: "2026-06-02T09:27:00.000Z",
  },
];

export function SurveyAnalysisPage() {
  const { surveyId = "" } = useParams();
  const { surveyId: filterSurveyId, filters, activeTab, setSurveyId, setFilters, setActiveTab, resetFilters } = useAdminFilterStore();
  const [groupBy, setGroupBy] = useState<GroupCompareDimension>("dormitory");
  const [groupTargetValue, setGroupTargetValue] = useState("survey");
  const [textKeyword, setTextKeyword] = useState("");
  const activeFilters = filterSurveyId === surveyId ? filters : {};
  const isOverviewTab = activeTab === "overview";
  const isScaleTab = activeTab === "scale";
  const isGroupsTab = activeTab === "groups";
  const isIdentityTab = activeTab === "identity";
  const isTextTab = activeTab === "text";
  const isHeatmapTab = activeTab === "heatmap";
  const textFilters: TextAnswerFilters = useMemo(
    () => ({ ...activeFilters, keyword: textKeyword.trim() || undefined }),
    [activeFilters, textKeyword],
  );
  const detailQuery = useSurveyDetailQuery(surveyId);
  const filterOptionsQuery = useFilterOptionsQuery(surveyId);
  const profileFilterDefinitions = useMemo(
    () => mergeProfileFilterDefinitionsWithOptions(buildProfileFilterDefinitions(detailQuery.data?.questions ?? []), filterOptionsQuery.data),
    [detailQuery.data?.questions, filterOptionsQuery.data],
  );
  const groupCompareDefinitions = useMemo(() => getGroupCompareDefinitions(profileFilterDefinitions), [profileFilterDefinitions]);
  const groupTargetOptions = useMemo(
    () => buildGroupCompareTargetOptions(detailQuery.data?.sections ?? [], detailQuery.data?.questions ?? []),
    [detailQuery.data?.questions, detailQuery.data?.sections],
  );
  const groupTargetFilter = useMemo(() => getGroupCompareTargetFilter(groupTargetValue, groupTargetOptions), [groupTargetOptions, groupTargetValue]);
  const groupCompareFilters = useMemo<GroupCompareFilters>(
    () => ({ ...activeFilters, groupBy, metricType: "satisfaction", ...groupTargetFilter }),
    [activeFilters, groupBy, groupTargetFilter],
  );
  const responseSummaryQuery = useResponseSummaryQuery(surveyId, activeFilters);
  const sectionSummaryQuery = useSectionSatisfactionSummaryQuery(surveyId, activeFilters, { enabled: isOverviewTab || isScaleTab });
  const questionSummaryQuery = useQuestionSatisfactionSummaryQuery(surveyId, activeFilters, { enabled: isScaleTab });
  const choiceDistributionQuery = useChoiceDistributionQuery(surveyId, activeFilters, { enabled: isScaleTab });
  const priorityTop5Query = usePriorityTop5Query(surveyId, activeFilters, { enabled: isOverviewTab });
  const identityResponsesQuery = useIdentityResponsesInfiniteQuery(surveyId, activeFilters, { enabled: isIdentityTab });
  const groupCompareQuery = useGroupCompareSummaryQuery(surveyId, groupCompareFilters, { enabled: isGroupsTab });
  const textGroupsQuery = useTextGroupsQuery(surveyId, textFilters, { enabled: isTextTab });
  const textAnswersQuery = useTextAnswersInfiniteQuery(surveyId, textFilters, { enabled: isTextTab });
  const imageTagFilters = activeFilters as HeatmapFilters;
  const heatmapPointsQuery = useHeatmapPointsQuery(surveyId, imageTagFilters, { enabled: isHeatmapTab });
  const imageTagAnswersQuery = useImageTagAnswersInfiniteQuery(surveyId, imageTagFilters, { enabled: isHeatmapTab });

  useEffect(() => {
    setSurveyId(surveyId || undefined);
  }, [setSurveyId, surveyId]);

  useEffect(() => {
    if (!detailQuery.data) return;
    const prunedFilters = pruneAnalysisFilters(activeFilters, profileFilterDefinitions);
    if (!areAnalysisFiltersEqual(activeFilters, prunedFilters)) {
      setFilters(prunedFilters);
    }
  }, [activeFilters, detailQuery.data, profileFilterDefinitions, setFilters]);

  useEffect(() => {
    if (!groupCompareDefinitions.length) return;
    if (!groupCompareDefinitions.some((definition) => definition.key === groupBy)) {
      setGroupBy(groupCompareDefinitions[0].key);
    }
  }, [groupBy, groupCompareDefinitions]);

  useEffect(() => {
    if (!groupTargetOptions.some((option) => option.value === groupTargetValue)) {
      setGroupTargetValue("survey");
    }
  }, [groupTargetOptions, groupTargetValue]);

  const questionById = useMemo(
    () => new Map((detailQuery.data?.questions ?? []).map((question) => [question.id, question] as const)),
    [detailQuery.data?.questions],
  );
  const assetById = useMemo(
    () => new Map((detailQuery.data?.assets ?? []).map((asset) => [asset.id, asset] as const)),
    [detailQuery.data?.assets],
  );
  const groups = useMemo(
    () => groupImageTagAnswers(imageTagAnswersQuery.data?.pages.flatMap((page) => page.items) ?? [], questionById, assetById),
    [assetById, imageTagAnswersQuery.data, questionById],
  );
  const textAnswers = useMemo(
    () => textAnswersQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [textAnswersQuery.data],
  );
  const identityResponses = useMemo(
    () => identityResponsesQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [identityResponsesQuery.data],
  );
  const displayIdentityResponses = import.meta.env.DEV && identityResponses.length === 0 ? devIdentityResponses : identityResponses;
  const adminImageGroups = groups.filter((group) => group.kind === "admin_image");
  const participantUploadGroups = groups.filter((group) => group.kind === "participant_upload");
  const satisfactionQuestions = useMemo(
    () => (questionSummaryQuery.data ?? []).filter((question) => question.metricType !== "importance"),
    [questionSummaryQuery.data],
  );
  const activeAnalysisQueries = [
    filterOptionsQuery,
    responseSummaryQuery,
    sectionSummaryQuery,
    questionSummaryQuery,
    choiceDistributionQuery,
    priorityTop5Query,
    identityResponsesQuery,
    groupCompareQuery,
    textGroupsQuery,
    textAnswersQuery,
    heatmapPointsQuery,
    imageTagAnswersQuery,
  ].filter((query) => query.fetchStatus !== "idle" || query.isError);

  if (!surveyId) {
    return (
      <section className="tg-analysis-page">
        <ErrorState title="설문 ID가 없습니다." description="설문 목록에서 다시 진입해주세요." />
      </section>
    );
  }

  if (detailQuery.isPending) {
    return (
      <section className="tg-analysis-page">
        <LoadingState label="분석 화면을 불러오는 중" />
      </section>
    );
  }

  if (detailQuery.isError) {
    return (
      <section className="tg-analysis-page">
        <ErrorState
          title="분석 화면을 불러오지 못했습니다."
          description="설문 데이터 또는 조회 권한을 확인해주세요."
          actionLabel="다시 시도"
          onAction={() => {
            void detailQuery.refetch();
          }}
        />
      </section>
    );
  }

  const responseSummary = responseSummaryQuery.data;
  const isFiltered = hasActiveFilters(activeFilters);
  const responseMetricLabel = isFiltered ? "조건 적용 응답" : "제출 완료";
  const responseMetricValue = formatCount(isFiltered ? responseSummary?.filteredResponses : responseSummary?.submittedResponses);
  const comparisonMetricLabel = isFiltered ? "전체 제출" : "전체 응답";
  const comparisonMetricValue = formatCount(isFiltered ? responseSummary?.submittedResponses : responseSummary?.totalResponses);

  return (
    <section className="tg-analysis-page" aria-labelledby="survey-analysis-title">
      <header className="tg-analysis-page__header">
        <div>
          <p>분석 화면</p>
          <h1 id="survey-analysis-title">{detailQuery.data.survey.title}</h1>
        </div>
        <div className="tg-analysis-page__metrics" aria-label="응답 현황">
          <Metric label={responseMetricLabel} value={responseMetricValue} tone={responseSummary?.isLowSample ? "warning" : undefined} />
          <Metric label={comparisonMetricLabel} value={comparisonMetricValue} />
          <Metric label="설문 버전" value={`v${detailQuery.data.survey.versionNumber}`} helper="현재 설문" />
        </div>
      </header>

      <GlobalFilterBar
        filters={activeFilters}
        fields={profileFilterDefinitions}
        isLoading={detailQuery.isFetching || filterOptionsQuery.isFetching || responseSummaryQuery.isFetching}
        totalResponses={responseSummary?.submittedResponses}
        filteredResponses={responseSummary?.filteredResponses}
        lowSampleThreshold={responseSummary?.lowSampleThreshold}
        onChange={(nextFilters) => setFilters(nextFilters)}
        onReset={resetFilters}
      />

      <nav className="tg-analysis-tabs" aria-label="분석 보기">
        {[
          ["overview", "개요"],
          ["scale", "점수 문항"],
          ["groups", "그룹별 비교"],
          ["identity", "상세 명단"],
          ["text", "서술형"],
          ["heatmap", "사진 표시"],
        ].map(([tab, label]) => (
          <button key={tab} type="button" className={activeTab === tab ? "tg-analysis-tabs__item--active" : ""} onClick={() => setActiveTab(tab as typeof activeTab)}>
            {label}
          </button>
        ))}
      </nav>

      {hasAnalysisError([
        filterOptionsQuery,
        responseSummaryQuery,
        sectionSummaryQuery,
        questionSummaryQuery,
        choiceDistributionQuery,
        priorityTop5Query,
        identityResponsesQuery,
        groupCompareQuery,
        textGroupsQuery,
        textAnswersQuery,
        heatmapPointsQuery,
        imageTagAnswersQuery,
      ]) ? (
        <ErrorState
          title="일부 분석 데이터를 불러오지 못했습니다."
          description="결과 계산 또는 응답 조회 권한을 확인해주세요."
          actionLabel="다시 시도"
          onAction={() => {
            activeAnalysisQueries.forEach((query) => void query.refetch());
          }}
        />
      ) : null}

      {activeTab === "overview" ? (
        <div className="tg-analysis-page__grid tg-analysis-page__grid--overview">
          <ResponseSummaryCard surveyId={surveyId} summary={responseSummary} filters={activeFilters} fields={profileFilterDefinitions} />
          <PriorityTop5Card surveyId={surveyId} issues={priorityTop5Query.data ?? []} filters={activeFilters} />
          <ProfileDistributionCard
            surveyId={surveyId}
            distribution={responseSummary?.profileDistribution}
            fields={profileFilterDefinitions}
            filters={activeFilters}
          />
          <SectionAverageCard surveyId={surveyId} sections={sectionSummaryQuery.data ?? []} filters={activeFilters} />
        </div>
      ) : null}

      {activeTab === "identity" ? (
        <div className="tg-analysis-page__grid">
          <IdentityResponseCard
            surveyId={surveyId}
            responses={displayIdentityResponses}
            filters={activeFilters}
            hasMore={Boolean(identityResponsesQuery.hasNextPage)}
            isLoadingMore={identityResponsesQuery.isFetchingNextPage}
            onLoadMore={() => {
              void identityResponsesQuery.fetchNextPage();
            }}
          />
        </div>
      ) : null}

      {activeTab === "scale" ? (
        <div className="tg-analysis-page__grid">
          <SectionAverageCard surveyId={surveyId} sections={sectionSummaryQuery.data ?? []} filters={activeFilters} />
          <QuestionAverageCard surveyId={surveyId} questions={satisfactionQuestions} filters={activeFilters} />
          <ChoiceDistributionCard surveyId={surveyId} distributions={choiceDistributionQuery.data ?? []} filters={activeFilters} />
        </div>
      ) : null}

      {activeTab === "groups" ? (
        <div className="tg-analysis-page__grid">
          <GroupCompareCard
            surveyId={surveyId}
            rows={groupCompareQuery.data ?? []}
            filters={activeFilters}
            groupBy={groupBy}
            targetValue={groupTargetValue}
            targetOptions={groupTargetOptions}
            fields={groupCompareDefinitions}
            onGroupByChange={setGroupBy}
            onTargetValueChange={setGroupTargetValue}
          />
        </div>
      ) : null}

      {activeTab === "text" ? (
        <div className="tg-analysis-page__grid">
          <TextEvidenceCard
            surveyId={surveyId}
            groups={textGroupsQuery.data ?? []}
            answers={textAnswers}
            filters={activeFilters}
            keyword={textKeyword}
            onKeywordChange={setTextKeyword}
            hasMore={Boolean(textAnswersQuery.hasNextPage)}
            isLoadingMore={textAnswersQuery.isFetchingNextPage}
            onLoadMore={() => {
              void textAnswersQuery.fetchNextPage();
            }}
          />
        </div>
      ) : null}

      {activeTab === "heatmap" ? (
        <div className="tg-analysis-page__sections">
          <HeatmapPointCard surveyId={surveyId} points={heatmapPointsQuery.data ?? []} filters={activeFilters} />
          {imageTagAnswersQuery.isPending ? <LoadingState label="사진 표시 답변을 불러오는 중" /> : null}
          <ImageTagAnswerSection
            headingId="analysis-admin-image-tags"
            title="준비된 사진 위 표시"
            description="관리자가 미리 올려둔 사진 위에 남겨진 표시입니다."
            icon={<ImageIcon size={16} aria-hidden="true" />}
            groups={adminImageGroups}
            emptyTitle="준비된 사진 위 표시가 없습니다."
            emptyDescription="사진 위에 표시한 답변이 있으면 여기에 표시됩니다."
            hasMore={Boolean(imageTagAnswersQuery.hasNextPage)}
            isLoadingMore={imageTagAnswersQuery.isFetchingNextPage}
            onLoadMore={() => {
              void imageTagAnswersQuery.fetchNextPage();
            }}
          />
          <ImageTagAnswerSection
            headingId="analysis-participant-upload-tags"
            title="참여자가 올린 사진 위 표시"
            description="참여자가 직접 올린 사진 위에 남긴 표시입니다."
            icon={<Upload size={16} aria-hidden="true" />}
            groups={participantUploadGroups}
            emptyTitle="참여자가 올린 사진 위 표시가 없습니다."
            emptyDescription="참여자가 올린 사진과 표시 답변이 있으면 여기에 표시됩니다."
            hasMore={Boolean(imageTagAnswersQuery.hasNextPage)}
            isLoadingMore={imageTagAnswersQuery.isFetchingNextPage}
            onLoadMore={() => {
              void imageTagAnswersQuery.fetchNextPage();
            }}
          />
        </div>
      ) : null}
    </section>
  );
}

function Metric(props: { label: string; value: string; helper?: string; tone?: "warning" }) {
  return (
    <div className={`tg-analysis-page__metric ${props.tone ? `tg-analysis-page__metric--${props.tone}` : ""}`}>
      <span>{props.label}</span>
      <strong>{props.value}</strong>
      {props.tone === "warning" ? <StatusBadge tone="warning">해석 주의</StatusBadge> : null}
      {props.helper ? <small>{props.helper}</small> : null}
    </div>
  );
}

function hasAnalysisError(queries: Array<{ isError: boolean }>): boolean {
  return queries.some((query) => query.isError);
}

function hasActiveFilters(filters: Record<string, unknown>): boolean {
  return Object.values(filters).some((value) => typeof value === "string" && value.trim().length > 0);
}

function formatCount(value: number | undefined): string {
  return typeof value === "number" ? String(value) : "-";
}

type GroupCompareTargetFilter = Pick<GroupCompareFilters, "targetKind" | "targetId">;

type ResolvedGroupCompareTargetOption = GroupCompareTargetOption &
  Readonly<{
    targetKind?: GroupCompareFilters["targetKind"];
    targetId?: string;
  }>;

function buildGroupCompareTargetOptions(sections: SurveySection[], questions: Question[]): ResolvedGroupCompareTargetOption[] {
  const options: ResolvedGroupCompareTargetOption[] = [{ value: "survey", label: "전체 설문" }];
  const scaleQuestions = questions.filter((question) => question.questionType === "scale" && question.metricType !== "importance");
  const topicKeys = new Set<string>();

  for (const section of sections) {
    options.push({
      value: `section:${section.id}`,
      label: `주제 · ${formatLocalizedTitle(section.title, section.sectionKey)}`,
      targetKind: "section",
      targetId: section.id,
    });
  }

  for (const question of scaleQuestions) {
    options.push({
      value: `question:${question.id}`,
      label: `질문 · ${formatLocalizedTitle(question.title, question.questionKey)}`,
      targetKind: "question",
      targetId: question.id,
    });
    const topicKey = question.topicKey?.trim();
    if (topicKey) topicKeys.add(topicKey);
  }

  for (const topicKey of [...topicKeys].sort((a, b) => a.localeCompare(b, "ko"))) {
    options.push({
      value: `topic:${topicKey}`,
      label: `같은 항목 · ${topicKey}`,
      targetKind: "topic",
      targetId: topicKey,
    });
  }

  return options;
}

function getGroupCompareTargetFilter(value: string, options: ResolvedGroupCompareTargetOption[]): GroupCompareTargetFilter {
  const option = options.find((item) => item.value === value);
  if (!option?.targetKind || !option.targetId) return {};
  return { targetKind: option.targetKind, targetId: option.targetId };
}

function formatLocalizedTitle(title: { ko?: string; en?: string }, fallback: string): string {
  return title.ko?.trim() || title.en?.trim() || fallback;
}

function groupImageTagAnswers(
  answers: ImageTagAnswer[],
  questionById: Map<string, Question>,
  assetById: Map<string, SurveyAsset>,
): ImageTagAnswerGroup[] {
  const groups = new Map<string, ImageTagAnswerGroup>();
  for (const answer of answers) {
    const question = answer.questionId ? questionById.get(answer.questionId) : undefined;
    const resolvedImage = resolveAnswerImage(answer, question, assetById);
    const key =
      answer.kind === "participant_upload"
        ? `${answer.responseId ?? answer.id}:${answer.questionId ?? "question"}:${resolvedImage?.storagePath ?? answer.id}`
        : `${answer.questionId ?? "question"}:${resolvedImage?.assetId ?? answer.assetId ?? "asset"}`;
    const existing = groups.get(key);
    if (existing) {
      groups.set(key, { ...existing, answers: [...existing.answers, answer] });
      continue;
    }
    groups.set(key, {
      key,
      kind: answer.kind,
      questionId: answer.questionId,
      questionTitle: answer.questionTitle,
      questionType: answer.questionType,
      sectionTitle: answer.sectionTitle,
      image: resolvedImage,
      answers: [answer],
    });
  }
  return [...groups.values()].sort((a, b) => a.questionTitle.localeCompare(b.questionTitle, "ko"));
}

function resolveAnswerImage(
  answer: ImageTagAnswer,
  question: Question | undefined,
  assetById: Map<string, SurveyAsset>,
): ImageTagAnswerImage | undefined {
  if (answer.image?.signedUrl || answer.image?.storagePath) return answer.image;
  const config = (question?.config ?? {}) as JsonRecord;
  const assetId = answer.assetId ?? getString(config.assetId);
  const asset = assetId ? assetById.get(assetId) : undefined;
  if (!asset) return answer.image;
  return {
    assetId: asset.id,
    storageBucket: asset.storageBucket,
    storagePath: asset.storagePath,
    signedUrl: getString(asset.metadata.signedUrl) ?? getString(asset.metadata.publicUrl),
    source: "survey_asset",
  };
}

function getString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}
