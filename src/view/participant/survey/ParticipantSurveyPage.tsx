import { AlertCircle, CheckCircle2, CircleHelp, ImagePlus, MousePointer2, Upload } from "lucide-react";
import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useParticipantQuestionImageUploadMutation, useParticipantSurveyQuery } from "../../../api/participant/query";
import type { JsonRecord, Question, SurveyAsset, SurveySection } from "../../../api/participant/model";
import { EmptyState, ErrorState, LoadingState } from "../../../components";
import "./css/ParticipantSurveyPage.css";

type ParticipantAnswer = ImageTagAnswer | undefined;
type ParticipantAnswers = Record<string, ParticipantAnswer>;
type ImageTagAnswer = Readonly<{
  image?: {
    storageBucket: string;
    storagePath: string;
    signedUrl?: string;
  };
  tags: ImageTagPin[];
}>;
type ImageTagPin = Readonly<{
  id: string;
  xRatio: number;
  yRatio: number;
  tagType?: string;
  text?: string;
}>;

export function ParticipantSurveyPage() {
  const { publicIdentifier = "" } = useParams();
  const surveyQuery = useParticipantSurveyQuery(publicIdentifier);
  const [answers, setAnswers] = useState<ParticipantAnswers>({});
  const questionsBySection = useMemo(
    () => groupQuestionsBySection(surveyQuery.data?.questions ?? []),
    [surveyQuery.data?.questions],
  );

  return (
    <main className="tg-participant-survey-page" aria-labelledby="participant-survey-title">
      {surveyQuery.isPending ? <LoadingState label="설문을 불러오는 중" /> : null}

      {surveyQuery.isError ? (
        <ErrorState
          title="설문을 찾을 수 없습니다."
          description="공개 식별자가 잘못되었거나 아직 게시되지 않은 설문입니다."
          icon={<AlertCircle size={18} aria-hidden="true" />}
        />
      ) : null}

      {surveyQuery.isSuccess ? (
        <>
          <header className="tg-participant-survey-page__header">
            <p className="tg-participant-survey-page__eyebrow">Taglow Survey</p>
            <h1 id="participant-survey-title">{surveyQuery.data.survey.title}</h1>
            {surveyQuery.data.survey.description ? <p>{surveyQuery.data.survey.description}</p> : null}
            <div className="tg-participant-survey-page__meta" aria-label="설문 공개 정보">
              <span>
                <CheckCircle2 size={14} aria-hidden="true" />
                게시됨
              </span>
              <span>v{surveyQuery.data.survey.versionNumber}</span>
              <span>{surveyQuery.data.survey.publicIdentifier}</span>
            </div>
          </header>

          {surveyQuery.data.sections.length === 0 ? (
            <EmptyState title="아직 표시할 섹션이 없습니다." description="관리자 빌더에서 섹션과 질문을 추가해주세요." />
          ) : (
            <div className="tg-participant-survey-page__sections">
              {surveyQuery.data.sections.map((section) => (
                <SectionView
                  key={section.id}
                  surveyId={surveyQuery.data.survey.id}
                  section={section}
                  questions={questionsBySection.get(section.id) ?? []}
                  assets={surveyQuery.data.assets}
                  answers={answers}
                  onAnswerChange={(questionId, answer) => setAnswers((current) => ({ ...current, [questionId]: answer }))}
                />
              ))}
            </div>
          )}
        </>
      ) : null}
    </main>
  );
}

function SectionView(props: {
  surveyId: string;
  section: SurveySection;
  questions: Question[];
  assets: SurveyAsset[];
  answers: ParticipantAnswers;
  onAnswerChange: (questionId: string, answer: ParticipantAnswer) => void;
}) {
  return (
    <section className="tg-participant-section" aria-labelledby={`participant-section-${props.section.id}`}>
      <header className="tg-participant-section__header">
        <p>Section {props.section.orderIndex + 1}</p>
        <h2 id={`participant-section-${props.section.id}`}>{props.section.title.ko}</h2>
        {props.section.description?.ko ? <span>{props.section.description.ko}</span> : null}
      </header>

      {props.questions.length === 0 ? (
        <div className="tg-participant-section__empty">이 섹션에는 아직 질문이 없습니다.</div>
      ) : (
        <ol className="tg-participant-question-list">
          {props.questions.map((question) => (
            <QuestionView
              key={question.id}
              surveyId={props.surveyId}
              question={question}
              assets={props.assets}
              answer={props.answers[question.id]}
              onAnswerChange={(answer) => props.onAnswerChange(question.id, answer)}
            />
          ))}
        </ol>
      )}
    </section>
  );
}

function QuestionView(props: {
  surveyId: string;
  question: Question;
  assets: SurveyAsset[];
  answer: ParticipantAnswer;
  onAnswerChange: (answer: ParticipantAnswer) => void;
}) {
  const options = getOptionLabels(props.question.config);
  return (
    <li className="tg-participant-question">
      <div className="tg-participant-question__header">
        <span>{formatQuestionType(props.question.questionType)}</span>
        {props.question.isRequired ? <strong>필수</strong> : null}
      </div>
      <h3>{props.question.title.ko}</h3>
      {props.question.description?.ko ? <p>{props.question.description.ko}</p> : null}
      {props.question.questionType === "image_tag" ? (
        <ImageTagQuestionControl
          question={props.question}
          assets={props.assets}
          answer={props.answer}
          onAnswerChange={props.onAnswerChange}
        />
      ) : props.question.questionType === "participant_image_tag" ? (
        <ParticipantImageTagQuestionControl
          surveyId={props.surveyId}
          question={props.question}
          answer={props.answer}
          onAnswerChange={props.onAnswerChange}
        />
      ) : options.length ? (
        <ul className="tg-participant-question__options" aria-label={`${props.question.title.ko} 선택지`}>
          {options.map((option) => (
            <li key={option}>{option}</li>
          ))}
        </ul>
      ) : (
        <div className="tg-participant-question__placeholder">
          <CircleHelp size={14} aria-hidden="true" />
          <span>{formatAnswerHint(props.question.questionType)}</span>
        </div>
      )}
    </li>
  );
}

function ImageTagQuestionControl(props: {
  question: Question;
  assets: SurveyAsset[];
  answer: ParticipantAnswer;
  onAnswerChange: (answer: ParticipantAnswer) => void;
}) {
  const config = toRecord(props.question.config);
  const assetId = getString(config.assetId) ?? getString(config.asset_id);
  const asset = props.assets.find((item) => item.id === assetId);
  const imageUrl = getAssetUrl(asset);
  const answer = isImageTagAnswer(props.answer) ? props.answer : { tags: [] };
  const maxTags = getNumber(config.maxTags) ?? 3;
  const tagTypes = getStringArray(config.tagTypes);

  return (
    <ImageTagSurface
      imageUrl={imageUrl}
      placeholder={asset ? asset.storagePath : "이미지가 연결되지 않았습니다."}
      tags={answer.tags}
      tagTypes={tagTypes}
      maxTags={maxTags}
      disabled={!imageUrl}
      onAddTag={(pin) => props.onAnswerChange({ ...answer, tags: [...answer.tags, pin] })}
      onUpdateTag={(pin) => props.onAnswerChange({ ...answer, tags: answer.tags.map((item) => (item.id === pin.id ? pin : item)) })}
    />
  );
}

function ParticipantImageTagQuestionControl(props: {
  surveyId: string;
  question: Question;
  answer: ParticipantAnswer;
  onAnswerChange: (answer: ParticipantAnswer) => void;
}) {
  const uploadMutation = useParticipantQuestionImageUploadMutation();
  const config = toRecord(props.question.config);
  const answer = isImageTagAnswer(props.answer) ? props.answer : { tags: [] };
  const tagTypes = getStringArray(config.tagTypes);
  const maxTags = getNumber(config.maxTags) ?? 3;
  const acceptedMimeTypes = getStringArray(config.acceptedMimeTypes);
  const accept = acceptedMimeTypes.length ? acceptedMimeTypes.join(",") : "image/*";

  return (
    <div className="tg-participant-image-upload">
      <label className="tg-participant-image-upload__button">
        <Upload size={15} aria-hidden="true" />
        <span>{answer.image ? "사진 다시 업로드" : "사진 업로드"}</span>
        <input
          aria-label="사진 업로드"
          type="file"
          accept={accept}
          disabled={uploadMutation.isPending}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (!file) return;
            uploadMutation.mutate(
              { surveyId: props.surveyId, questionId: props.question.id, file },
              {
                onSuccess: (uploaded) => {
                  props.onAnswerChange({
                    image: {
                      storageBucket: uploaded.storageBucket,
                      storagePath: uploaded.storagePath,
                      signedUrl: uploaded.signedUrl,
                    },
                    tags: [],
                  });
                },
              },
            );
          }}
        />
      </label>
      {uploadMutation.isError ? <p role="alert">사진을 업로드하지 못했습니다.</p> : null}
      <ImageTagSurface
        imageUrl={answer.image?.signedUrl}
        placeholder={answer.image?.storagePath ?? "사진을 올리면 태깅 영역이 표시됩니다."}
        tags={answer.tags}
        tagTypes={tagTypes}
        maxTags={maxTags}
        disabled={!answer.image?.signedUrl}
        onAddTag={(pin) => props.onAnswerChange({ ...answer, tags: [...answer.tags, pin] })}
        onUpdateTag={(pin) => props.onAnswerChange({ ...answer, tags: answer.tags.map((item) => (item.id === pin.id ? pin : item)) })}
      />
    </div>
  );
}

function ImageTagSurface(props: {
  imageUrl?: string;
  placeholder: string;
  tags: ImageTagPin[];
  tagTypes: string[];
  maxTags: number;
  disabled: boolean;
  onAddTag: (pin: ImageTagPin) => void;
  onUpdateTag: (pin: ImageTagPin) => void;
}) {
  return (
    <div className="tg-participant-image-tag">
      <button
        type="button"
        className="tg-participant-image-tag__surface"
        aria-label="이미지 태깅 영역"
        disabled={props.disabled || props.tags.length >= props.maxTags}
        onClick={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          props.onAddTag({
            id: crypto.randomUUID(),
            xRatio: ratioFromPoint(event.clientX - rect.left, rect.width),
            yRatio: ratioFromPoint(event.clientY - rect.top, rect.height),
            tagType: props.tagTypes[0],
          });
        }}
      >
        {props.imageUrl ? <img src={props.imageUrl} alt="" /> : <span>{props.placeholder}</span>}
        {props.tags.map((tag, index) => (
          <i key={tag.id} style={{ left: `${tag.xRatio * 100}%`, top: `${tag.yRatio * 100}%` }}>
            {index + 1}
          </i>
        ))}
      </button>
      <div className="tg-participant-image-tag__meta">
        <MousePointer2 size={14} aria-hidden="true" />
        <span>{props.tags.length} / {props.maxTags}</span>
      </div>
      {props.tags.length ? (
        <div className="tg-participant-image-tag__tags">
          {props.tags.map((tag, index) => (
            <div key={tag.id}>
              <strong>태그 {index + 1}</strong>
              {props.tagTypes.length ? (
                <select
                  aria-label={`태그 ${index + 1} 카테고리`}
                  value={tag.tagType ?? props.tagTypes[0]}
                  onChange={(event) => props.onUpdateTag({ ...tag, tagType: event.target.value })}
                >
                  {props.tagTypes.map((tagType) => (
                    <option key={tagType} value={tagType}>
                      {tagType}
                    </option>
                  ))}
                </select>
              ) : null}
              <input
                aria-label={`태그 ${index + 1} 설명`}
                value={tag.text ?? ""}
                placeholder="설명"
                onChange={(event) => props.onUpdateTag({ ...tag, text: event.target.value })}
              />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function groupQuestionsBySection(questions: Question[]): Map<string, Question[]> {
  const grouped = new Map<string, Question[]>();
  for (const question of questions) {
    const items = grouped.get(question.sectionId) ?? [];
    items.push(question);
    grouped.set(question.sectionId, items);
  }
  return grouped;
}

function getOptionLabels(config: JsonRecord): string[] {
  const rawOptions = Array.isArray(config.options) ? config.options : [];
  return rawOptions
    .map((option) => {
      if (typeof option === "string") return option;
      if (isRecord(option)) {
        const label = option.label;
        if (typeof label === "string") return label;
        if (isRecord(label) && typeof label.ko === "string") return label.ko;
        if (typeof option.labelKo === "string") return option.labelKo;
        if (typeof option.value === "string") return option.value;
      }
      return undefined;
    })
    .filter((option): option is string => Boolean(option));
}

function toRecord(value: unknown): JsonRecord {
  return isRecord(value) ? value : {};
}

function getString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function getNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function getStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];
}

function getAssetUrl(asset: SurveyAsset | undefined): string | undefined {
  if (!asset) return undefined;
  return getString(asset.metadata.signedUrl) ?? getString(asset.metadata.publicUrl) ?? getString(asset.metadata.public_url);
}

function isImageTagAnswer(value: unknown): value is ImageTagAnswer {
  return isRecord(value) && Array.isArray(value.tags);
}

function ratioFromPoint(offset: number, total: number): number {
  if (!Number.isFinite(offset) || !Number.isFinite(total) || total <= 0) return 0.5;
  return Math.min(1, Math.max(0, offset / total));
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function formatQuestionType(type: Question["questionType"]): string {
  const labels: Record<Question["questionType"], string> = {
    profile: "프로필",
    experience: "경험 여부",
    scale: "척도",
    single_choice: "단일 선택",
    multi_select: "복수 선택",
    ranking: "순위",
    text: "주관식",
    image_tag: "이미지 태깅",
    participant_image_tag: "태깅 건의",
    attention_check: "주의 확인",
  };
  return labels[type];
}

function formatAnswerHint(type: Question["questionType"]): string {
  if (type === "scale") return "척도 응답 영역";
  if (type === "text") return "텍스트 응답 영역";
  if (type === "image_tag") return "이미지 태깅 응답 영역";
  if (type === "participant_image_tag") return "사진 업로드 후 태깅 응답 영역";
  if (type === "ranking") return "순위 응답 영역";
  return "응답 영역";
}
