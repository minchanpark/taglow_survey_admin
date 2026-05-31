import { AlertCircle, ArrowLeft, ArrowRight, CheckCircle2, CircleHelp, LogIn, MousePointer2, Upload } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  useParticipantGoogleSignInMutation,
  useParticipantQuestionImageUploadMutation,
  useParticipantSessionQuery,
  useParticipantSurveyQuery,
} from "../../../api/participant/query";
import type { JsonRecord, ParticipantSurvey, Question, SurveyAsset, SurveySection } from "../../../api/participant/model";
import { Button, EmptyState, ErrorState, LoadingState } from "../../../components";
import "./css/ParticipantSurveyPage.css";

type ParticipantFlowStep = Readonly<
  | { type: "login" }
  | { type: "intro" }
  | { type: "section"; sectionIndex: number }
  | { type: "complete" }
>;
type ParticipantAnswer = number | string | string[] | ChoiceTextAnswer | ImageTagAnswer | undefined;
type ParticipantAnswers = Record<string, ParticipantAnswer>;
type ChoiceOption = Readonly<{
  value: string;
  labelKo: string;
  labelEn?: string;
}>;
type ChoiceTextAnswer = Readonly<{
  choiceValue?: string;
  text?: string;
}>;
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
  const sessionQuery = useParticipantSessionQuery();
  const signInMutation = useParticipantGoogleSignInMutation();
  const surveyQuery = useParticipantSurveyQuery(publicIdentifier, Boolean(sessionQuery.data?.isAuthenticated));
  const signInRedirectTo = useMemo(() => new URL(`/survey/${encodeURIComponent(publicIdentifier)}`, window.location.origin).toString(), [publicIdentifier]);
  const [step, setStep] = useState<ParticipantFlowStep>({ type: "login" });
  const [answers, setAnswers] = useState<ParticipantAnswers>({});
  const questionsBySection = useMemo(
    () => groupQuestionsBySection(surveyQuery.data?.questions ?? []),
    [surveyQuery.data?.questions],
  );
  const sortedSections = useMemo(
    () => [...(surveyQuery.data?.sections ?? [])].sort((a, b) => a.orderIndex - b.orderIndex),
    [surveyQuery.data?.sections],
  );
  const introSection = sortedSections.find(isIntroSection);
  const answerSections = sortedSections.filter((section) => !isIntroSection(section));
  const currentSectionIndex = step.type === "section" ? Math.min(step.sectionIndex, Math.max(answerSections.length - 1, 0)) : 0;
  const currentSection = answerSections[currentSectionIndex];

  useEffect(() => {
    setStep({ type: "login" });
    setAnswers({});
  }, [publicIdentifier]);

  return (
    <main className="tg-participant-survey-page" aria-labelledby="participant-survey-title">
      {sessionQuery.isPending ? <LoadingState label="로그인 상태를 확인하는 중" /> : null}

      {sessionQuery.isError ? (
        <ErrorState
          title="로그인 상태를 확인하지 못했습니다."
          description="네트워크 상태를 확인한 뒤 다시 시도해주세요."
          icon={<AlertCircle size={18} aria-hidden="true" />}
        />
      ) : null}

      {sessionQuery.isSuccess && !sessionQuery.data.isAuthenticated ? (
        <ParticipantLoginStep
          isAuthenticated={false}
          isBusy={signInMutation.isPending}
          email={sessionQuery.data.email}
          onSignIn={() => signInMutation.mutate({ redirectTo: signInRedirectTo })}
        />
      ) : null}

      {sessionQuery.isSuccess && sessionQuery.data.isAuthenticated && surveyQuery.isPending ? <LoadingState label="설문을 불러오는 중" /> : null}

      {sessionQuery.isSuccess && sessionQuery.data.isAuthenticated && surveyQuery.isError ? (
        <ErrorState
          title="설문을 찾을 수 없습니다."
          description="공개 식별자가 잘못되었거나 아직 게시되지 않은 설문입니다."
          icon={<AlertCircle size={18} aria-hidden="true" />}
        />
      ) : null}

      {sessionQuery.isSuccess && sessionQuery.data.isAuthenticated && surveyQuery.isSuccess ? (
        <>
          {step.type === "login" ? (
            <ParticipantLoginStep
              isAuthenticated
              isBusy={false}
              email={sessionQuery.data.email}
              surveyTitle={surveyQuery.data.survey.title}
              onContinue={() => setStep({ type: "intro" })}
              onSignIn={() => signInMutation.mutate({ redirectTo: signInRedirectTo })}
            />
          ) : null}

          {step.type === "intro" ? (
            <ParticipantIntroStep
              survey={surveyQuery.data.survey}
              introSection={introSection}
              introQuestions={introSection ? questionsBySection.get(introSection.id) ?? [] : []}
              assets={surveyQuery.data.assets}
              answers={answers}
              onAnswerChange={(questionId, answer) => setAnswers((current) => ({ ...current, [questionId]: answer }))}
              onStart={() => setStep(answerSections.length ? { type: "section", sectionIndex: 0 } : { type: "complete" })}
            />
          ) : null}

          {step.type === "section" && answerSections.length === 0 ? (
            <EmptyState title="아직 표시할 섹션이 없습니다." description="관리자 빌더에서 섹션과 질문을 추가해주세요." />
          ) : null}

          {step.type === "section" && currentSection ? (
            <ParticipantSectionStep
              surveyId={surveyQuery.data.survey.id}
              section={currentSection}
              sectionIndex={currentSectionIndex}
              sectionCount={answerSections.length}
              questions={questionsBySection.get(currentSection.id) ?? []}
              assets={surveyQuery.data.assets}
              answers={answers}
              onAnswerChange={(questionId, answer) => setAnswers((current) => ({ ...current, [questionId]: answer }))}
              onBack={() => setStep(currentSectionIndex === 0 ? { type: "intro" } : { type: "section", sectionIndex: currentSectionIndex - 1 })}
              onNext={() =>
                setStep(currentSectionIndex >= answerSections.length - 1 ? { type: "complete" } : { type: "section", sectionIndex: currentSectionIndex + 1 })
              }
            />
          ) : null}

          {step.type === "complete" ? (
            <ParticipantCompleteStep
              onBack={() => setStep(answerSections.length ? { type: "section", sectionIndex: answerSections.length - 1 } : { type: "intro" })}
            />
          ) : null}
        </>
      ) : null}
    </main>
  );
}

function ParticipantLoginStep(props: {
  isAuthenticated: boolean;
  isBusy: boolean;
  email?: string;
  surveyTitle?: string;
  onSignIn: () => void;
  onContinue?: () => void;
}) {
  return (
    <section className="tg-participant-flow-card" aria-labelledby="participant-survey-title">
      <p className="tg-participant-survey-page__eyebrow">Taglow Survey</p>
      <h1 id="participant-survey-title">로그인</h1>
      <p>
        {props.surveyTitle ? `${props.surveyTitle} 응답을 시작하기 전에 Google 계정으로 로그인해주세요.` : "설문 응답을 시작하기 전에 Google 계정으로 로그인해주세요."}
      </p>
      {props.email ? (
        <div className="tg-participant-flow-card__status">
          <CheckCircle2 size={14} aria-hidden="true" />
          <span>{props.email}</span>
        </div>
      ) : null}
      <div className="tg-participant-flow-card__actions">
        {props.isAuthenticated ? (
          <Button variant="primary" icon={<ArrowRight size={16} aria-hidden="true" />} onClick={props.onContinue}>
            인트로로 이동
          </Button>
        ) : (
          <Button variant="primary" icon={<LogIn size={16} aria-hidden="true" />} onClick={props.onSignIn} disabled={props.isBusy}>
            Google로 로그인
          </Button>
        )}
      </div>
    </section>
  );
}

function ParticipantIntroStep(props: {
  survey: ParticipantSurvey;
  introSection?: SurveySection;
  introQuestions: Question[];
  assets: SurveyAsset[];
  answers: ParticipantAnswers;
  onAnswerChange: (questionId: string, answer: ParticipantAnswer) => void;
  onStart: () => void;
}) {
  return (
    <>
      <section className="tg-participant-flow-card" aria-labelledby="participant-survey-title">
        <p className="tg-participant-survey-page__eyebrow">인트로</p>
        <h1 id="participant-survey-title">{props.survey.title}</h1>
        {props.survey.description ? (
          <p className="tg-participant-survey-page__intro-copy">
            <AutoLinkedText text={props.survey.description} />
          </p>
        ) : null}
        {props.introSection?.description?.ko ? <p>{props.introSection.description.ko}</p> : null}
        <div className="tg-participant-survey-page__meta" aria-label="설문 공개 정보">
          <span>
            <CheckCircle2 size={14} aria-hidden="true" />
            게시됨
          </span>
          <span>v{props.survey.versionNumber}</span>
          <span>{props.survey.publicIdentifier}</span>
        </div>
        <div className="tg-participant-flow-card__actions">
          <Button variant="primary" icon={<ArrowRight size={16} aria-hidden="true" />} onClick={props.onStart}>
            섹션 시작
          </Button>
        </div>
      </section>
      {props.introSection && props.introQuestions.length ? (
        <SectionView
          surveyId={props.survey.id}
          section={props.introSection}
          questions={props.introQuestions}
          assets={props.assets}
          answers={props.answers}
          onAnswerChange={props.onAnswerChange}
        />
      ) : null}
    </>
  );
}

type AutoLinkedTextPart = Readonly<
  | { type: "text"; text: string }
  | { type: "link"; text: string; href: string }
>;

const autoLinkPattern = /(?:https?:\/\/|www\.)[^\s<]+/gi;
const trailingUrlPunctuationPattern = /[.,!?;:)\]}>"'’”。]+$/;

function AutoLinkedText(props: { text: string }) {
  return (
    <>
      {splitAutoLinkedText(props.text).map((part, index) =>
        part.type === "link" ? (
          <a key={`${part.href}-${index}`} href={part.href} target="_blank" rel="noreferrer noopener">
            {part.text}
          </a>
        ) : (
          part.text
        ),
      )}
    </>
  );
}

function splitAutoLinkedText(text: string): AutoLinkedTextPart[] {
  const parts: AutoLinkedTextPart[] = [];
  let cursor = 0;

  for (const match of text.matchAll(autoLinkPattern)) {
    const rawText = match[0];
    const startIndex = match.index ?? 0;
    const matchedEndIndex = startIndex + rawText.length;
    const linkText = rawText.replace(trailingUrlPunctuationPattern, "");
    const trailingText = rawText.slice(linkText.length);

    if (!linkText) continue;
    if (startIndex > cursor) {
      parts.push({ type: "text", text: text.slice(cursor, startIndex) });
    }
    parts.push({ type: "link", text: linkText, href: toAutoLinkHref(linkText) });
    if (trailingText) {
      parts.push({ type: "text", text: trailingText });
    }
    cursor = matchedEndIndex;
  }

  if (cursor < text.length) {
    parts.push({ type: "text", text: text.slice(cursor) });
  }

  return parts;
}

function toAutoLinkHref(text: string): string {
  return text.toLowerCase().startsWith("www.") ? `https://${text}` : text;
}

function ParticipantSectionStep(props: {
  surveyId: string;
  section: SurveySection;
  sectionIndex: number;
  sectionCount: number;
  questions: Question[];
  assets: SurveyAsset[];
  answers: ParticipantAnswers;
  onAnswerChange: (questionId: string, answer: ParticipantAnswer) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const isLastSection = props.sectionIndex >= props.sectionCount - 1;
  return (
    <div className="tg-participant-step">
      <div className="tg-participant-step__progress" aria-label="섹션 진행률">
        <span>{props.sectionIndex + 1}</span>
        <strong>/ {props.sectionCount}</strong>
      </div>
      <SectionView
        surveyId={props.surveyId}
        section={props.section}
        questions={props.questions}
        assets={props.assets}
        answers={props.answers}
        onAnswerChange={props.onAnswerChange}
      />
      <div className="tg-participant-step__actions">
        <Button variant="secondary" icon={<ArrowLeft size={16} aria-hidden="true" />} onClick={props.onBack}>
          이전
        </Button>
        <Button variant="primary" icon={<ArrowRight size={16} aria-hidden="true" />} onClick={props.onNext}>
          {isLastSection ? "완료" : "다음 섹션"}
        </Button>
      </div>
    </div>
  );
}

function ParticipantCompleteStep(props: { onBack: () => void }) {
  return (
    <section className="tg-participant-flow-card" aria-labelledby="participant-survey-title">
      <p className="tg-participant-survey-page__eyebrow">완료</p>
      <h1 id="participant-survey-title">모든 섹션을 확인했습니다.</h1>
      <p>응답 제출 단계가 연결되면 이 화면에서 최종 확인 후 제출할 수 있습니다.</p>
      <div className="tg-participant-flow-card__actions">
        <Button variant="secondary" icon={<ArrowLeft size={16} aria-hidden="true" />} onClick={props.onBack}>
          이전 섹션
        </Button>
      </div>
    </section>
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
  const questionKind = getParticipantQuestionKind(props.question);
  return (
    <li className="tg-participant-question">
      <div className="tg-participant-question__header">
        <span>{formatQuestionType(props.question)}</span>
        {props.question.isRequired ? <strong>필수</strong> : null}
      </div>
      <h3>{props.question.title.ko}</h3>
      {props.question.description?.ko ? <p>{props.question.description.ko}</p> : null}
      {questionKind === "scale" ? (
        <ScaleQuestionControl question={props.question} answer={props.answer} onAnswerChange={props.onAnswerChange} />
      ) : questionKind === "single_choice" ? (
        <SingleChoiceQuestionControl question={props.question} answer={props.answer} onAnswerChange={props.onAnswerChange} />
      ) : questionKind === "multi_select" ? (
        <MultiSelectQuestionControl question={props.question} answer={props.answer} onAnswerChange={props.onAnswerChange} />
      ) : questionKind === "choice_text" ? (
        <ChoiceTextQuestionControl question={props.question} answer={props.answer} onAnswerChange={props.onAnswerChange} />
      ) : questionKind === "short_text" ? (
        <ShortTextQuestionControl question={props.question} answer={props.answer} onAnswerChange={props.onAnswerChange} />
      ) : questionKind === "text" ? (
        <TextQuestionControl question={props.question} answer={props.answer} onAnswerChange={props.onAnswerChange} />
      ) : props.question.questionType === "image_tag" ? (
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
      ) : (
        <div className="tg-participant-question__placeholder">
          <CircleHelp size={14} aria-hidden="true" />
          <span>{formatAnswerHint(props.question.questionType)}</span>
        </div>
      )}
    </li>
  );
}

function ScaleQuestionControl(props: {
  question: Question;
  answer: ParticipantAnswer;
  onAnswerChange: (answer: ParticipantAnswer) => void;
}) {
  const config = toRecord(props.question.config);
  const min = getNumber(config.scaleMin) ?? 1;
  const max = getNumber(config.scaleMax) ?? 5;
  const labels = getStringArray(config.labelsKo);
  const values = Array.from({ length: Math.max(1, max - min + 1) }, (_, index) => min + index);

  return (
    <div className="tg-participant-scale" role="radiogroup" aria-label={`${props.question.title.ko} 척도`}>
      {values.map((value, index) => (
        <button
          key={value}
          type="button"
          className={props.answer === value ? "tg-participant-scale__item tg-participant-scale__item--active" : "tg-participant-scale__item"}
          aria-pressed={props.answer === value}
          onClick={() => props.onAnswerChange(value)}
        >
          <strong>{value}</strong>
          {labels[index] ? <span>{labels[index]}</span> : null}
        </button>
      ))}
    </div>
  );
}

function SingleChoiceQuestionControl(props: {
  question: Question;
  answer: ParticipantAnswer;
  onAnswerChange: (answer: ParticipantAnswer) => void;
}) {
  const options = getChoiceOptions(props.question.config);
  const selected = typeof props.answer === "string" ? props.answer : "";

  return (
    <div className="tg-participant-choice-list">
      {options.map((option) => (
        <label key={option.value} className="tg-participant-choice">
          <input
            type="radio"
            name={`participant-${props.question.id}`}
            checked={selected === option.value}
            onChange={() => props.onAnswerChange(option.value)}
          />
          <span>{option.labelKo}</span>
        </label>
      ))}
    </div>
  );
}

function MultiSelectQuestionControl(props: {
  question: Question;
  answer: ParticipantAnswer;
  onAnswerChange: (answer: ParticipantAnswer) => void;
}) {
  const options = getChoiceOptions(props.question.config);
  const selected = Array.isArray(props.answer) ? props.answer.filter((value): value is string => typeof value === "string") : [];
  const maxSelect = getNumber(toRecord(props.question.config).maxSelect);

  return (
    <div className="tg-participant-choice-list">
      {options.map((option) => {
        const checked = selected.includes(option.value);
        const disabled = Boolean(maxSelect && !checked && selected.length >= maxSelect);
        return (
          <label key={option.value} className="tg-participant-choice">
            <input
              type="checkbox"
              checked={checked}
              disabled={disabled}
              onChange={(event) => {
                const next = event.target.checked
                  ? [...selected, option.value]
                  : selected.filter((value) => value !== option.value);
                props.onAnswerChange(next.length ? next : undefined);
              }}
            />
            <span>{option.labelKo}</span>
          </label>
        );
      })}
    </div>
  );
}

function TextQuestionControl(props: {
  question: Question;
  answer: ParticipantAnswer;
  onAnswerChange: (answer: ParticipantAnswer) => void;
}) {
  return (
    <label className="tg-participant-field">
      <span>답변</span>
      <textarea
        rows={4}
        value={typeof props.answer === "string" ? props.answer : ""}
        onChange={(event) => props.onAnswerChange(event.target.value || undefined)}
      />
    </label>
  );
}

function ShortTextQuestionControl(props: {
  question: Question;
  answer: ParticipantAnswer;
  onAnswerChange: (answer: ParticipantAnswer) => void;
}) {
  const maxLength = getNumber(toRecord(props.question.config).maxLength);
  return (
    <label className="tg-participant-field">
      <span>단답형 답변</span>
      <input
        type="text"
        maxLength={maxLength}
        value={typeof props.answer === "string" ? props.answer : ""}
        onChange={(event) => props.onAnswerChange(event.target.value || undefined)}
      />
    </label>
  );
}

function ChoiceTextQuestionControl(props: {
  question: Question;
  answer: ParticipantAnswer;
  onAnswerChange: (answer: ParticipantAnswer) => void;
}) {
  const options = getChoiceOptions(props.question.config);
  const answer = isChoiceTextAnswer(props.answer) ? props.answer : {};

  return (
    <div className="tg-participant-choice-text">
      <div className="tg-participant-choice-list">
        {options.map((option) => (
          <label key={option.value} className="tg-participant-choice">
            <input
              type="radio"
              name={`participant-choice-text-${props.question.id}`}
              checked={answer.choiceValue === option.value}
              onChange={() => props.onAnswerChange({ ...answer, choiceValue: option.value })}
            />
            <span>{option.labelKo}</span>
          </label>
        ))}
      </div>
      <label className="tg-participant-field">
        <span>상세 답변</span>
        <textarea
          rows={4}
          value={answer.text ?? ""}
          onChange={(event) => props.onAnswerChange({ ...answer, text: event.target.value || undefined })}
        />
      </label>
    </div>
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
  for (const question of [...questions].sort((a, b) => a.orderIndex - b.orderIndex)) {
    const items = grouped.get(question.sectionId) ?? [];
    items.push(question);
    grouped.set(question.sectionId, items);
  }
  return grouped;
}

function isIntroSection(section: SurveySection): boolean {
  return section.sectionType === "intro" || section.sectionKey.toLowerCase().includes("intro");
}

function getChoiceOptions(config: JsonRecord): ChoiceOption[] {
  const rawOptions = Array.isArray(config.options) ? config.options : [];
  return rawOptions
    .map((option, index) => {
      if (typeof option === "string" && option.trim()) return { value: `option_${index + 1}`, labelKo: option.trim() };
      if (isRecord(option)) {
        const label = option.label;
        const value = typeof option.value === "string" && option.value.trim() ? option.value : `option_${index + 1}`;
        const labelKo =
          typeof option.labelKo === "string" && option.labelKo.trim()
            ? option.labelKo
            : isRecord(label) && typeof label.ko === "string" && label.ko.trim()
              ? label.ko
              : typeof label === "string" && label.trim()
                ? label
                : value;
        const labelEn = typeof option.labelEn === "string" ? option.labelEn : undefined;
        return labelEn ? { value, labelKo, labelEn } : { value, labelKo };
      }
      return undefined;
    })
    .filter((option): option is ChoiceOption => Boolean(option));
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

function isChoiceTextAnswer(value: unknown): value is ChoiceTextAnswer {
  return isRecord(value) && !Array.isArray(value.tags);
}

function getParticipantQuestionKind(question: Question): "scale" | "single_choice" | "multi_select" | "text" | "short_text" | "choice_text" | Question["questionType"] {
  if (question.questionType === "attention_check") return "scale";
  if (question.questionType === "profile") {
    const config = toRecord(question.config);
    return getString(config.inputType) === "single_choice" ? "single_choice" : "text";
  }
  if (question.questionType === "text" && isShortTextQuestion(question)) return "short_text";
  if (question.questionType === "text" && isChoiceTextQuestion(question)) return "choice_text";
  return question.questionType;
}

function isShortTextQuestion(question: Question): boolean {
  if (question.questionType !== "text") return false;
  const config = toRecord(question.config);
  return config.textMode === "short" || config.inputMode === "short" || (config.multiline === false && !Array.isArray(config.options));
}

function isChoiceTextQuestion(question: Question): boolean {
  if (question.questionType !== "text") return false;
  const config = toRecord(question.config);
  return (
    config.textMode === "choice_then_text" ||
    config.inputMode === "choice_then_text" ||
    config.choiceFirst === true ||
    Array.isArray(config.options)
  );
}

function ratioFromPoint(offset: number, total: number): number {
  if (!Number.isFinite(offset) || !Number.isFinite(total) || total <= 0) return 0.5;
  return Math.min(1, Math.max(0, offset / total));
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function formatQuestionType(question: Question): string {
  if (isShortTextQuestion(question)) return "단답형";
  if (isChoiceTextQuestion(question)) return "선택후 주관식";
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
  return labels[question.questionType];
}

function formatAnswerHint(type: Question["questionType"]): string {
  if (type === "scale") return "척도 응답 영역";
  if (type === "text") return "텍스트 응답 영역";
  if (type === "image_tag") return "이미지 태깅 응답 영역";
  if (type === "participant_image_tag") return "사진 업로드 후 태깅 응답 영역";
  if (type === "ranking") return "순위 응답 영역";
  return "응답 영역";
}
