import { AlertCircle, ArrowLeft, ArrowRight, CheckCircle2, CircleHelp, LogIn, MousePointer2, Upload } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import {
  useParticipantGoogleSignInMutation,
  useParticipantLoginContentQuery,
  useParticipantQuestionImageUploadMutation,
  useParticipantSessionQuery,
  useParticipantSurveyQuery,
  useSubmitSurveyResponseMutation,
} from "../../../api/participant/query";
import {
  getAnswerSections,
  getAssetUrl,
  getChoiceOptions,
  getConfiguredAssetId,
  getParticipantLoginContentSettings,
  getLocalizedTagTypeOptions,
  getMaxSelect,
  getMaxTags,
  getNumber,
  getQuestionKind,
  getScaleBounds,
  getScaleLabels,
  getString,
  getStringArray,
  groupQuestionsBySection,
  isIntroSection,
  localizedOption,
  localizedText,
  ratioFromPoint,
  shouldShowQuestion,
  sortByOrder,
  toRecord,
  type Locale,
} from "../../../api/admin/model";
import type { JsonRecord, ParticipantLoginContent, ParticipantSurvey, ParticipantSurveyDetail, Question, SubmitSurveyResponseResult, SurveyAsset, SurveySection } from "../../../api/participant/model";
import { Button, EmptyState, ErrorState, LoadingState } from "../../../components";
import { buildSubmitSurveyResponseCommand } from "./participantSubmission";
import type { ChoiceTextAnswer, ImageTagAnswer, ImageTagPin, ParticipantAnswer, ParticipantAnswers, ParticipantFlowStep } from "./participantSurveyTypes";
import "./css/ParticipantSurveyPage.css";

export function ParticipantSurveyPage() {
  const { publicIdentifier = "" } = useParams();
  const [searchParams] = useSearchParams();
  const sessionQuery = useParticipantSessionQuery();
  const signInMutation = useParticipantGoogleSignInMutation();
  const submitMutation = useSubmitSurveyResponseMutation();
  const loginContentQuery = useParticipantLoginContentQuery(publicIdentifier);
  const surveyQuery = useParticipantSurveyQuery(publicIdentifier, Boolean(sessionQuery.data?.isAuthenticated));
  const signInRedirectTo = useMemo(() => new URL(`/survey/${encodeURIComponent(publicIdentifier)}`, window.location.origin).toString(), [publicIdentifier]);
  const [step, setStep] = useState<ParticipantFlowStep>({ type: "login" });
  const [answers, setAnswers] = useState<ParticipantAnswers>({});
  const [startedAt, setStartedAt] = useState(() => new Date().toISOString());
  const [clientSubmissionId, setClientSubmissionId] = useState(() => crypto.randomUUID());
  const [submittedResult, setSubmittedResult] = useState<SubmitSurveyResponseResult | undefined>();
  const locale = normalizeLocale(searchParams.get("locale"));
  const questionsBySection = useMemo(
    () => groupQuestionsBySection(surveyQuery.data?.questions ?? []),
    [surveyQuery.data?.questions],
  );
  const allQuestions = surveyQuery.data?.questions ?? [];
  const sortedSections = useMemo(
    () => sortByOrder(surveyQuery.data?.sections ?? []),
    [surveyQuery.data?.sections],
  );
  const introSection = sortedSections.find(isIntroSection);
  const answerSections = useMemo(() => getAnswerSections(sortedSections), [sortedSections]);
  const currentSectionIndex = step.type === "section" ? Math.min(step.sectionIndex, Math.max(answerSections.length - 1, 0)) : 0;
  const currentSection = answerSections[currentSectionIndex];
  const loginContent = loginContentQuery.data ?? (surveyQuery.data ? buildLoginContentFromSurveyDetail(surveyQuery.data) : null);

  useEffect(() => {
    setStep({ type: "login" });
    setAnswers({});
    setStartedAt(new Date().toISOString());
    setClientSubmissionId(crypto.randomUUID());
    setSubmittedResult(undefined);
    submitMutation.reset();
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
          loginContent={loginContent}
          locale={locale}
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
              loginContent={loginContent}
              locale={locale}
              surveyTitle={surveyQuery.data.survey.title}
              onContinue={() => setStep({ type: "intro" })}
              onSignIn={() => signInMutation.mutate({ redirectTo: signInRedirectTo })}
            />
          ) : null}

          {step.type === "intro" ? (
            <ParticipantIntroStep
              survey={surveyQuery.data.survey}
              introSection={introSection}
              introQuestions={introSection ? getVisibleQuestions(questionsBySection.get(introSection.id) ?? [], allQuestions, answers) : []}
              assets={surveyQuery.data.assets}
              answers={answers}
              locale={locale}
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
              questions={getVisibleQuestions(questionsBySection.get(currentSection.id) ?? [], allQuestions, answers)}
              assets={surveyQuery.data.assets}
              answers={answers}
              locale={locale}
              onAnswerChange={(questionId, answer) => setAnswers((current) => ({ ...current, [questionId]: answer }))}
              onBack={() => setStep(currentSectionIndex === 0 ? { type: "intro" } : { type: "section", sectionIndex: currentSectionIndex - 1 })}
              onNext={() =>
                setStep(currentSectionIndex >= answerSections.length - 1 ? { type: "complete" } : { type: "section", sectionIndex: currentSectionIndex + 1 })
              }
            />
          ) : null}

          {step.type === "complete" ? (
            <ParticipantCompleteStep
              isSubmitting={submitMutation.isPending}
              isSubmitted={Boolean(submittedResult)}
              errorMessage={submitMutation.isError ? "응답을 제출하지 못했습니다. 필수 문항과 네트워크 상태를 확인한 뒤 다시 시도해주세요." : undefined}
              result={submittedResult}
              onBack={() => setStep(answerSections.length ? { type: "section", sectionIndex: answerSections.length - 1 } : { type: "intro" })}
              onSubmit={() => {
                if (submittedResult || !surveyQuery.data) return;
                submitMutation.mutate(
                  buildSubmitSurveyResponseCommand({
                    surveyId: surveyQuery.data.survey.id,
                    clientSubmissionId,
                    locale,
                    startedAt,
                    questions: surveyQuery.data.questions,
                    answers,
                  }),
                  {
                    onSuccess: (result) => setSubmittedResult(result),
                  },
                );
              }}
            />
          ) : null}
        </>
      ) : null}
    </main>
  );
}

function getVisibleQuestions(questions: Question[], allQuestions: Question[], answers: ParticipantAnswers): Question[] {
  return questions.filter((question) => shouldShowQuestion({ question, questions: allQuestions, values: answers }));
}

function ParticipantLoginStep(props: {
  isAuthenticated: boolean;
  isBusy: boolean;
  email?: string;
  loginContent?: ParticipantLoginContent | null;
  locale: Locale;
  surveyTitle?: string;
  onSignIn: () => void;
  onContinue?: () => void;
}) {
  const headline = getLoginHeadline(props.loginContent, props.locale);
  const bodyParagraphs = getLoginBodyParagraphs(props.loginContent, props.locale);
  return (
    <section className="tg-participant-flow-card tg-participant-login-card" aria-labelledby="participant-survey-title">
      {props.loginContent?.headerImage?.signedUrl ? (
        <img className="tg-participant-login-card__header-image" src={props.loginContent.headerImage.signedUrl} alt="" />
      ) : null}
      <p className="tg-participant-survey-page__eyebrow">Taglow Survey</p>
      <h1 id="participant-survey-title">{headline || "로그인"}</h1>
      {bodyParagraphs.length ? (
        <div className="tg-participant-login-card__body">
          {bodyParagraphs.map((paragraph, index) => (
            <p key={`${index}-${paragraph}`}>
              <AutoLinkedText text={paragraph} />
            </p>
          ))}
        </div>
      ) : (
        <p>
          {props.surveyTitle ? `${props.surveyTitle} 응답을 시작하기 전에 Google 계정으로 로그인해주세요.` : "설문 응답을 시작하기 전에 Google 계정으로 로그인해주세요."}
        </p>
      )}
      {props.email ? (
        <div className="tg-participant-flow-card__status">
          <CheckCircle2 size={14} aria-hidden="true" />
          <span>{props.email}</span>
        </div>
      ) : null}
      {props.loginContent?.bottomImage?.signedUrl ? (
        <img className="tg-participant-login-card__bottom-image" src={props.loginContent.bottomImage.signedUrl} alt="" />
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

function buildLoginContentFromSurveyDetail(detail: ParticipantSurveyDetail): ParticipantLoginContent | null {
  const settings = getParticipantLoginContentSettings(detail.survey.settings);
  const bodyParagraphs = settings.bodyParagraphs.filter(Boolean);
  const bodyParagraphsEn = settings.bodyParagraphsEn.filter(Boolean);
  const headerImage = settings.headerImageAssetId ? toLoginImage(detail.assets, settings.headerImageAssetId) : undefined;
  const bottomImage = settings.bottomImageAssetId ? toLoginImage(detail.assets, settings.bottomImageAssetId) : undefined;
  if (!settings.headline && !settings.headlineEn && !bodyParagraphs.length && !bodyParagraphsEn.length && !headerImage && !bottomImage) return null;
  return {
    title: detail.survey.title,
    headline: settings.headline,
    headlineEn: settings.headlineEn,
    bodyParagraphs,
    bodyParagraphsEn,
    headerImage,
    bottomImage,
  };
}

function getLoginHeadline(content: ParticipantLoginContent | null | undefined, locale: Locale): string | undefined {
  if (!content) return undefined;
  return locale === "en" ? content.headlineEn || content.headline : content.headline || content.headlineEn;
}

function getLoginBodyParagraphs(content: ParticipantLoginContent | null | undefined, locale: Locale): string[] {
  if (!content) return [];
  const primary = locale === "en" ? content.bodyParagraphsEn : content.bodyParagraphs;
  const fallback = locale === "en" ? content.bodyParagraphs : content.bodyParagraphsEn;
  const paragraphs = primary.map((paragraph, index) => paragraph || fallback[index] || "").filter(Boolean);
  return paragraphs.length ? paragraphs : fallback.filter(Boolean);
}

function toLoginImage(assets: SurveyAsset[], assetId: string) {
  const asset = assets.find((item) => item.id === assetId);
  const signedUrl = asset ? getAssetUrl(asset) : undefined;
  if (!asset) return undefined;
  return {
    assetId: asset.id,
    storageBucket: asset.storageBucket,
    storagePath: asset.storagePath,
    signedUrl,
  };
}

function ParticipantIntroStep(props: {
  survey: ParticipantSurvey;
  introSection?: SurveySection;
  introQuestions: Question[];
  assets: SurveyAsset[];
  answers: ParticipantAnswers;
  locale: Locale;
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
            <AutoLinkedText text={localizedText(props.survey.description, props.locale)} />
          </p>
        ) : null}
        {props.introSection?.description ? <p>{localizedText(props.introSection.description, props.locale)}</p> : null}
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
            locale={props.locale}
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
  locale: Locale;
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
        locale={props.locale}
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

function ParticipantCompleteStep(props: {
  isSubmitting: boolean;
  isSubmitted: boolean;
  errorMessage?: string;
  result?: SubmitSurveyResponseResult;
  onBack: () => void;
  onSubmit: () => void;
}) {
  return (
    <section className="tg-participant-flow-card" aria-labelledby="participant-survey-title">
      <p className="tg-participant-survey-page__eyebrow">완료</p>
      <h1 id="participant-survey-title">{props.isSubmitted ? "응답을 제출했습니다." : "응답을 제출해주세요."}</h1>
      <p>{props.isSubmitted ? "참여해주셔서 감사합니다. 제출된 응답은 분석에 반영됩니다." : "마지막으로 제출 버튼을 누르면 응답이 저장됩니다."}</p>
      {props.result ? (
        <div className="tg-participant-flow-card__status">
          <CheckCircle2 size={14} aria-hidden="true" />
          <span>{props.result.alreadySubmitted ? "이미 제출된 응답을 확인했습니다." : "제출 완료"}</span>
        </div>
      ) : null}
      {props.errorMessage ? (
        <div className="tg-participant-flow-card__status tg-participant-flow-card__status--danger" role="alert">
          <AlertCircle size={14} aria-hidden="true" />
          <span>{props.errorMessage}</span>
        </div>
      ) : null}
      <div className="tg-participant-flow-card__actions">
        <Button variant="secondary" icon={<ArrowLeft size={16} aria-hidden="true" />} onClick={props.onBack} disabled={props.isSubmitting || props.isSubmitted}>
          이전 섹션
        </Button>
        <Button variant="primary" icon={<CheckCircle2 size={16} aria-hidden="true" />} onClick={props.onSubmit} disabled={props.isSubmitting || props.isSubmitted}>
          {props.isSubmitting ? "제출 중" : props.isSubmitted ? "제출 완료" : "응답 제출"}
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
  locale: Locale;
  onAnswerChange: (questionId: string, answer: ParticipantAnswer) => void;
}) {
  return (
    <section className="tg-participant-section" aria-labelledby={`participant-section-${props.section.id}`}>
      <header className="tg-participant-section__header">
        <p>Section {props.section.orderIndex + 1}</p>
        <h2 id={`participant-section-${props.section.id}`}>{localizedText(props.section.title, props.locale)}</h2>
        {props.section.description ? <span>{localizedText(props.section.description, props.locale)}</span> : null}
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
              locale={props.locale}
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
  locale: Locale;
  onAnswerChange: (answer: ParticipantAnswer) => void;
}) {
  const questionKind = getQuestionKind(props.question);
  return (
    <li className="tg-participant-question">
      <div className="tg-participant-question__header">
        <span>{formatQuestionType(props.question)}</span>
        {props.question.isRequired ? <strong>필수</strong> : null}
      </div>
      <h3>{localizedText(props.question.title, props.locale)}</h3>
      {props.question.description ? <p>{localizedText(props.question.description, props.locale)}</p> : null}
      {questionKind === "scale" ? (
        <ScaleQuestionControl question={props.question} locale={props.locale} answer={props.answer} onAnswerChange={props.onAnswerChange} />
      ) : questionKind === "single_choice" ? (
        <SingleChoiceQuestionControl question={props.question} locale={props.locale} answer={props.answer} onAnswerChange={props.onAnswerChange} />
      ) : questionKind === "multi_select" ? (
        <MultiSelectQuestionControl question={props.question} locale={props.locale} answer={props.answer} onAnswerChange={props.onAnswerChange} />
      ) : questionKind === "choice_text" ? (
        <ChoiceTextQuestionControl question={props.question} locale={props.locale} answer={props.answer} onAnswerChange={props.onAnswerChange} />
      ) : questionKind === "short_text" ? (
        <ShortTextQuestionControl question={props.question} answer={props.answer} onAnswerChange={props.onAnswerChange} />
      ) : questionKind === "text" ? (
        <TextQuestionControl question={props.question} answer={props.answer} onAnswerChange={props.onAnswerChange} />
      ) : props.question.questionType === "image_tag" ? (
        <ImageTagQuestionControl
          question={props.question}
          assets={props.assets}
          answer={props.answer}
          locale={props.locale}
          onAnswerChange={props.onAnswerChange}
        />
      ) : props.question.questionType === "participant_image_tag" ? (
        <ParticipantImageTagQuestionControl
          surveyId={props.surveyId}
          question={props.question}
          answer={props.answer}
          locale={props.locale}
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
  locale: Locale;
  answer: ParticipantAnswer;
  onAnswerChange: (answer: ParticipantAnswer) => void;
}) {
  const { min, max } = getScaleBounds(props.question);
  const labels = getScaleLabels(props.question, props.locale);
  const values = Array.from({ length: Math.max(1, max - min + 1) }, (_, index) => min + index);

  return (
    <div className="tg-participant-scale" role="radiogroup" aria-label={`${localizedText(props.question.title, props.locale)} 척도`}>
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
  locale: Locale;
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
          <span>{localizedOption(option, props.locale)}</span>
        </label>
      ))}
    </div>
  );
}

function MultiSelectQuestionControl(props: {
  question: Question;
  locale: Locale;
  answer: ParticipantAnswer;
  onAnswerChange: (answer: ParticipantAnswer) => void;
}) {
  const options = getChoiceOptions(props.question.config);
  const selected = Array.isArray(props.answer) ? props.answer.filter((value): value is string => typeof value === "string") : [];
  const maxSelect = getMaxSelect(props.question);

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
            <span>{localizedOption(option, props.locale)}</span>
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
  locale: Locale;
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
            <span>{localizedOption(option, props.locale)}</span>
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
  locale: Locale;
  onAnswerChange: (answer: ParticipantAnswer) => void;
}) {
  const assetId = getConfiguredAssetId(props.question);
  const asset = props.assets.find((item) => item.id === assetId);
  const imageUrl = getAssetUrl(asset);
  const answer = isImageTagAnswer(props.answer) ? props.answer : { tags: [] };
  const maxTags = getMaxTags(props.question);
  const tagOptions = getLocalizedTagTypeOptions(props.question, props.locale);

  return (
    <ImageTagSurface
      imageUrl={imageUrl}
      placeholder={asset ? asset.storagePath : "이미지가 연결되지 않았습니다."}
      tags={answer.tags}
      tagOptions={tagOptions}
      locale={props.locale}
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
  locale: Locale;
  onAnswerChange: (answer: ParticipantAnswer) => void;
}) {
  const uploadMutation = useParticipantQuestionImageUploadMutation();
  const config = toRecord(props.question.config);
  const answer = isImageTagAnswer(props.answer) ? props.answer : { tags: [] };
  const tagOptions = getLocalizedTagTypeOptions(props.question, props.locale);
  const maxTags = getMaxTags(props.question);
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
        tagOptions={tagOptions}
        locale={props.locale}
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
  tagOptions: Array<{ value: string; labelKo: string; labelEn?: string }>;
  locale: Locale;
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
            tagType: props.tagOptions[0]?.value,
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
              {props.tagOptions.length ? (
                <select
                  aria-label={`태그 ${index + 1} 카테고리`}
                  value={tag.tagType ?? props.tagOptions[0]?.value}
                  onChange={(event) => props.onUpdateTag({ ...tag, tagType: event.target.value })}
                >
                  {props.tagOptions.map((tagOption) => (
                    <option key={tagOption.value} value={tagOption.value}>
                      {localizedOption(tagOption, props.locale)}
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

function isImageTagAnswer(value: unknown): value is ImageTagAnswer {
  return isRecord(value) && Array.isArray(value.tags);
}

function isChoiceTextAnswer(value: unknown): value is ChoiceTextAnswer {
  return isRecord(value) && !Array.isArray(value.tags);
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function formatQuestionType(question: Question): string {
  if (getQuestionKind(question) === "short_text") return "단답형";
  if (getQuestionKind(question) === "choice_text") return "선택후 주관식";
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

function normalizeLocale(value: string | null): Locale {
  return value === "en" ? "en" : "ko";
}
