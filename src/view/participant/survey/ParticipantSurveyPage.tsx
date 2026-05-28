import { AlertCircle, CheckCircle2, CircleHelp } from "lucide-react";
import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { useParticipantSurveyQuery } from "../../../api/participant/query";
import type { JsonRecord, Question, SurveySection } from "../../../api/participant/model";
import { EmptyState, ErrorState, LoadingState } from "../../../components";
import "./css/ParticipantSurveyPage.css";

export function ParticipantSurveyPage() {
  const { publicIdentifier = "" } = useParams();
  const surveyQuery = useParticipantSurveyQuery(publicIdentifier);
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
                  section={section}
                  questions={questionsBySection.get(section.id) ?? []}
                />
              ))}
            </div>
          )}
        </>
      ) : null}
    </main>
  );
}

function SectionView(props: { section: SurveySection; questions: Question[] }) {
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
            <QuestionView key={question.id} question={question} />
          ))}
        </ol>
      )}
    </section>
  );
}

function QuestionView(props: { question: Question }) {
  const options = getOptionLabels(props.question.config);
  return (
    <li className="tg-participant-question">
      <div className="tg-participant-question__header">
        <span>{formatQuestionType(props.question.questionType)}</span>
        {props.question.isRequired ? <strong>필수</strong> : null}
      </div>
      <h3>{props.question.title.ko}</h3>
      {props.question.description?.ko ? <p>{props.question.description.ko}</p> : null}
      {options.length ? (
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
        if (typeof option.value === "string") return option.value;
      }
      return undefined;
    })
    .filter((option): option is string => Boolean(option));
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
    attention_check: "주의 확인",
  };
  return labels[type];
}

function formatAnswerHint(type: Question["questionType"]): string {
  if (type === "scale") return "척도 응답 영역";
  if (type === "text") return "텍스트 응답 영역";
  if (type === "image_tag") return "이미지 태깅 응답 영역";
  if (type === "ranking") return "순위 응답 영역";
  return "응답 영역";
}
