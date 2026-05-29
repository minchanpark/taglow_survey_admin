import { ImageIcon, Upload } from "lucide-react";
import { useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { useFilterOptionsQuery, useImageTagAnswersQuery, useSurveyDetailQuery } from "../../../api/admin/query";
import type { HeatmapFilters, ImageTagAnswer, ImageTagAnswerImage, JsonRecord, Question, SurveyAsset } from "../../../api/admin/model";
import { ErrorState, LoadingState } from "../../../components";
import { useAdminFilterStore } from "../../../store";
import { GlobalFilterBar } from "./components/GlobalFilterBar";
import {
  countUniqueImageTagResponses,
  ImageTagAnswerSection,
  type ImageTagAnswerGroup,
} from "./components/ImageTagAnswerSection";
import "./css/SurveyAnalysisPage.css";

export function SurveyAnalysisPage() {
  const { surveyId = "" } = useParams();
  const { surveyId: filterSurveyId, filters, setSurveyId, setFilters, resetFilters } = useAdminFilterStore();
  const activeFilters = filterSurveyId === surveyId ? filters : {};
  const detailQuery = useSurveyDetailQuery(surveyId);
  const filterOptionsQuery = useFilterOptionsQuery(surveyId);
  const imageTagFilters = activeFilters as HeatmapFilters;
  const imageTagAnswersQuery = useImageTagAnswersQuery(surveyId, imageTagFilters);

  useEffect(() => {
    setSurveyId(surveyId || undefined);
  }, [setSurveyId, surveyId]);

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

  if (detailQuery.isPending || imageTagAnswersQuery.isPending) {
    return (
      <section className="tg-analysis-page">
        <LoadingState label="태깅 답변을 불러오는 중" />
      </section>
    );
  }

  if (detailQuery.isError || imageTagAnswersQuery.isError) {
    return (
      <section className="tg-analysis-page">
        <ErrorState
          title="태깅 답변을 불러오지 못했습니다."
          description="응답 데이터 또는 분석 조회 권한을 확인해주세요."
          actionLabel="다시 시도"
          onAction={() => {
            void detailQuery.refetch();
            void imageTagAnswersQuery.refetch();
          }}
        />
      </section>
    );
  }

  const filterOptions = filterOptionsQuery.data;
  const totalAnswers = imageTagAnswersQuery.data.length;
  const submittedResponseCount = countUniqueImageTagResponses(imageTagAnswersQuery.data);

  return (
    <section className="tg-analysis-page" aria-labelledby="survey-analysis-title">
      <header className="tg-analysis-page__header">
        <div>
          <p>분석 워크벤치</p>
          <h1 id="survey-analysis-title">{detailQuery.data.survey.title}</h1>
        </div>
        <div className="tg-analysis-page__metrics" aria-label="태깅 답변 요약">
          <Metric label="응답 수" value={`${submittedResponseCount}`} />
          <Metric label="태그" value={`${totalAnswers}`} />
          <Metric label="질문" value={`${groups.length}`} />
        </div>
      </header>

      <GlobalFilterBar
        filters={activeFilters}
        options={filterOptions}
        isLoading={filterOptionsQuery.isPending}
        onChange={(nextFilters) => setFilters(nextFilters)}
        onReset={resetFilters}
      />

      <div className="tg-analysis-page__sections">
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
