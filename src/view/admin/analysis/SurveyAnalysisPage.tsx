import { ImageIcon, Upload } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  useBorichSummaryQuery,
  useChoiceDistributionQuery,
  useGroupCompareSummaryQuery,
  useHeatmapPointsQuery,
  useImageTagAnswersQuery,
  useLocusSummaryQuery,
  usePriorityTop5Query,
  useQuestionSatisfactionSummaryQuery,
  useResponseSummaryQuery,
  useSectionSatisfactionSummaryQuery,
  useSurveyDetailQuery,
  useTextAnswersQuery,
  useTextGroupsQuery,
} from "../../../api/admin/query";
import {
  areAnalysisFiltersEqual,
  buildProfileFilterDefinitions,
  getGroupCompareDefinitions,
  pruneAnalysisFilters,
} from "../../../api/admin/model";
import type {
  GroupCompareDimension,
  HeatmapFilters,
  ImageTagAnswer,
  ImageTagAnswerImage,
  JsonRecord,
  Question,
  SurveyAsset,
  TextAnswerFilters,
} from "../../../api/admin/model";
import { ErrorState, LoadingState } from "../../../components";
import { useAdminFilterStore } from "../../../store";
import {
  BorichCard,
  ChoiceDistributionCard,
  GroupCompareCard,
  HeatmapPointCard,
  LocusCard,
  PriorityTop5Card,
  ProfileDistributionCard,
  QuestionAverageCard,
  ResponseSummaryCard,
  SectionAverageCard,
  TextEvidenceCard,
} from "./components/AnalysisWorkbenchCards";
import { GlobalFilterBar } from "./components/GlobalFilterBar";
import {
  countUniqueImageTagResponses,
  ImageTagAnswerSection,
  type ImageTagAnswerGroup,
} from "./components/ImageTagAnswerSection";
import "./css/SurveyAnalysisPage.css";

export function SurveyAnalysisPage() {
  const { surveyId = "" } = useParams();
  const { surveyId: filterSurveyId, filters, activeTab, setSurveyId, setFilters, setActiveTab, resetFilters } = useAdminFilterStore();
  const [groupBy, setGroupBy] = useState<GroupCompareDimension>("dormitory");
  const [textKeyword, setTextKeyword] = useState("");
  const activeFilters = filterSurveyId === surveyId ? filters : {};
  const textFilters: TextAnswerFilters = useMemo(
    () => ({ ...activeFilters, keyword: textKeyword.trim() || undefined }),
    [activeFilters, textKeyword],
  );
  const detailQuery = useSurveyDetailQuery(surveyId);
  const profileFilterDefinitions = useMemo(() => buildProfileFilterDefinitions(detailQuery.data?.questions ?? []), [detailQuery.data?.questions]);
  const groupCompareDefinitions = useMemo(() => getGroupCompareDefinitions(profileFilterDefinitions), [profileFilterDefinitions]);
  const responseSummaryQuery = useResponseSummaryQuery(surveyId, activeFilters);
  const sectionSummaryQuery = useSectionSatisfactionSummaryQuery(surveyId, activeFilters);
  const questionSummaryQuery = useQuestionSatisfactionSummaryQuery(surveyId, activeFilters);
  const choiceDistributionQuery = useChoiceDistributionQuery(surveyId, activeFilters);
  const priorityTop5Query = usePriorityTop5Query(surveyId, activeFilters);
  const borichQuery = useBorichSummaryQuery(surveyId, activeFilters);
  const locusQuery = useLocusSummaryQuery(surveyId, activeFilters);
  const groupCompareQuery = useGroupCompareSummaryQuery(surveyId, { ...activeFilters, groupBy });
  const textGroupsQuery = useTextGroupsQuery(surveyId, textFilters);
  const textAnswersQuery = useTextAnswersQuery(surveyId, textFilters);
  const imageTagFilters = activeFilters as HeatmapFilters;
  const heatmapPointsQuery = useHeatmapPointsQuery(surveyId, imageTagFilters);
  const imageTagAnswersQuery = useImageTagAnswersQuery(surveyId, imageTagFilters);

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

  const questionById = useMemo(
    () => new Map((detailQuery.data?.questions ?? []).map((question) => [question.id, question] as const)),
    [detailQuery.data?.questions],
  );
  const assetById = useMemo(
    () => new Map((detailQuery.data?.assets ?? []).map((asset) => [asset.id, asset] as const)),
    [detailQuery.data?.assets],
  );
  const groups = useMemo(
    () => groupImageTagAnswers(imageTagAnswersQuery.data ?? [], questionById, assetById),
    [assetById, imageTagAnswersQuery.data, questionById],
  );
  const adminImageGroups = groups.filter((group) => group.kind === "admin_image");
  const participantUploadGroups = groups.filter((group) => group.kind === "participant_upload");

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
        <LoadingState label="분석 워크벤치를 불러오는 중" />
      </section>
    );
  }

  if (detailQuery.isError) {
    return (
      <section className="tg-analysis-page">
        <ErrorState
          title="분석 워크벤치를 불러오지 못했습니다."
          description="설문 데이터 또는 분석 조회 권한을 확인해주세요."
          actionLabel="다시 시도"
          onAction={() => {
            void detailQuery.refetch();
          }}
        />
      </section>
    );
  }

  const totalAnswers = imageTagAnswersQuery.data?.length ?? 0;
  const submittedResponseCount = countUniqueImageTagResponses(imageTagAnswersQuery.data ?? []);
  const responseSummary = responseSummaryQuery.data;

  return (
    <section className="tg-analysis-page" aria-labelledby="survey-analysis-title">
      <header className="tg-analysis-page__header">
        <div>
          <p>분석 워크벤치</p>
          <h1 id="survey-analysis-title">{detailQuery.data.survey.title}</h1>
        </div>
        <div className="tg-analysis-page__metrics" aria-label="태깅 답변 요약">
          <Metric label="응답 수" value={`${responseSummary?.filteredResponses ?? submittedResponseCount}`} />
          <Metric label="태그" value={`${totalAnswers}`} />
          <Metric label="버전" value={`v${detailQuery.data.survey.versionNumber}`} />
        </div>
      </header>

      <GlobalFilterBar
        filters={activeFilters}
        fields={profileFilterDefinitions}
        isLoading={detailQuery.isFetching}
        totalResponses={responseSummary?.submittedResponses}
        filteredResponses={responseSummary?.filteredResponses}
        lowSampleThreshold={responseSummary?.lowSampleThreshold}
        onChange={(nextFilters) => setFilters(nextFilters)}
        onReset={resetFilters}
      />

      <nav className="tg-analysis-tabs" aria-label="분석 보기">
        {[
          ["overview", "개요"],
          ["scale", "척도"],
          ["groups", "집단 비교"],
          ["text", "주관식"],
          ["heatmap", "공간 태깅"],
        ].map(([tab, label]) => (
          <button key={tab} type="button" className={activeTab === tab ? "tg-analysis-tabs__item--active" : ""} onClick={() => setActiveTab(tab as typeof activeTab)}>
            {label}
          </button>
        ))}
      </nav>

      {hasAnalysisError([
        responseSummaryQuery,
        sectionSummaryQuery,
        questionSummaryQuery,
        choiceDistributionQuery,
        priorityTop5Query,
        borichQuery,
        locusQuery,
        groupCompareQuery,
        textGroupsQuery,
        textAnswersQuery,
        heatmapPointsQuery,
        imageTagAnswersQuery,
      ]) ? (
        <ErrorState
          title="일부 분석 데이터를 불러오지 못했습니다."
          description="분석 RPC 또는 응답 조회 권한을 확인해주세요."
          actionLabel="다시 시도"
          onAction={() => {
            void responseSummaryQuery.refetch();
            void sectionSummaryQuery.refetch();
            void questionSummaryQuery.refetch();
            void choiceDistributionQuery.refetch();
            void priorityTop5Query.refetch();
            void borichQuery.refetch();
            void locusQuery.refetch();
            void groupCompareQuery.refetch();
            void textGroupsQuery.refetch();
            void textAnswersQuery.refetch();
            void heatmapPointsQuery.refetch();
            void imageTagAnswersQuery.refetch();
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

      {activeTab === "scale" || activeTab === "borich" ? (
        <div className="tg-analysis-page__grid">
          <QuestionAverageCard surveyId={surveyId} questions={questionSummaryQuery.data ?? []} filters={activeFilters} />
          <ChoiceDistributionCard surveyId={surveyId} distributions={choiceDistributionQuery.data ?? []} filters={activeFilters} />
          <BorichCard surveyId={surveyId} rows={borichQuery.data ?? []} filters={activeFilters} />
          <LocusCard surveyId={surveyId} rows={locusQuery.data ?? []} filters={activeFilters} />
        </div>
      ) : null}

      {activeTab === "groups" ? (
        <div className="tg-analysis-page__grid">
          <GroupCompareCard
            surveyId={surveyId}
            rows={groupCompareQuery.data ?? []}
            filters={activeFilters}
            groupBy={groupBy}
            fields={groupCompareDefinitions}
            onGroupByChange={setGroupBy}
          />
        </div>
      ) : null}

      {activeTab === "text" ? (
        <div className="tg-analysis-page__grid">
          <TextEvidenceCard
            surveyId={surveyId}
            groups={textGroupsQuery.data ?? []}
            answers={textAnswersQuery.data ?? []}
            filters={activeFilters}
            keyword={textKeyword}
            onKeywordChange={setTextKeyword}
          />
        </div>
      ) : null}

      {activeTab === "heatmap" ? (
        <div className="tg-analysis-page__sections">
          <HeatmapPointCard surveyId={surveyId} points={heatmapPointsQuery.data ?? []} filters={activeFilters} />
          {imageTagAnswersQuery.isPending ? <LoadingState label="태깅 답변을 불러오는 중" /> : null}
          <ImageTagAnswerSection
            headingId="analysis-admin-image-tags"
            title="관리자 이미지 태깅"
            description="관리자가 미리 올려둔 이미지 위에 기록된 태깅 답변입니다."
            icon={<ImageIcon size={16} aria-hidden="true" />}
            groups={adminImageGroups}
            emptyTitle="관리자 이미지 태깅 답변이 없습니다."
            emptyDescription="image_tag 질문에 제출된 좌표 답변이 있으면 여기에 표시됩니다."
          />
          <ImageTagAnswerSection
            headingId="analysis-participant-upload-tags"
            title="참여자 업로드 태깅"
            description="참여자가 직접 올린 사진 위에 남긴 태깅 답변입니다."
            icon={<Upload size={16} aria-hidden="true" />}
            groups={participantUploadGroups}
            emptyTitle="참여자 업로드 태깅 답변이 없습니다."
            emptyDescription="participant_image_tag 질문에 제출된 사진과 좌표 답변이 있으면 여기에 표시됩니다."
          />
        </div>
      ) : null}
    </section>
  );
}

function Metric(props: { label: string; value: string }) {
  return (
    <div className="tg-analysis-page__metric">
      <span>{props.label}</span>
      <strong>{props.value}</strong>
    </div>
  );
}

function hasAnalysisError(queries: Array<{ isError: boolean }>): boolean {
  return queries.some((query) => query.isError);
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
