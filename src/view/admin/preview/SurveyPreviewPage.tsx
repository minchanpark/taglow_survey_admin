import { AlertTriangle, CheckCircle2, Eye, Monitor, MousePointer2, RefreshCcw, Smartphone, Upload } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { usePreviewSurveyQuery } from "../../../api/admin/query";
import {
  buildChoiceMatrixOptions,
  getAssetUrl,
  getChoiceMatrix,
  getChoiceOptions,
  getConfiguredAssetId,
  getLocalizedTagTypeOptions,
  getExperienceFallbackOptions,
  getMaxSelect,
  getMaxTags,
  getNumber,
  getQuestionKind,
  getScaleBounds,
  getScaleLabels,
  localizedSurveyTitle,
  localizedOption,
  localizedText,
  ratioFromPoint,
  shouldShowQuestion,
  sortByOrder,
  toRecord,
  type ChoiceOption,
  type JsonRecord,
  type Locale,
  type PreviewDevice,
  type PreviewOptions,
  type Question,
  type SurveyAsset,
  type SurveySection,
} from "../../../api/admin/model";
import { Button, EmptyState, ErrorState, LoadingState, StatusBadge, SurveyStatusBadge } from "../../../components";
import { useAdminPreviewStore } from "../../../store";
import { getPreviewIssues } from "./previewValidation";
import "./css/SurveyPreviewPage.css";

type PreviewAnswer = string | number | string[] | RankingAnswer | ChoiceTextPreviewAnswer | ImageTagDraft[] | ParticipantImageTagDraft;
type PreviewAnswers = Record<string, PreviewAnswer | undefined>;
type RankingAnswer = Record<string, number | undefined>;
type ChoiceTextPreviewAnswer = Readonly<{
  choiceValue?: string;
  text?: string;
}>;
type ImageTagDraft = Readonly<{
  id: string;
  xRatio: number;
  yRatio: number;
  tagType?: string;
}>;
type ParticipantImageTagDraft = Readonly<{
  imageUrl?: string;
  fileName?: string;
  tags: ImageTagDraft[];
}>;

export function SurveyPreviewPage() {
  const { surveyId = "" } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [answers, setAnswers] = useState<PreviewAnswers>({});
  const setStoreLocale = useAdminPreviewStore((state) => state.setLocale);
  const setStoreDevice = useAdminPreviewStore((state) => state.setDevice);
  const setStoreActiveSectionId = useAdminPreviewStore((state) => state.setActiveSectionId);

  const locale = normalizeLocale(searchParams.get("locale"));
  const device = normalizeDevice(searchParams.get("device"));
  const sectionId = searchParams.get("section_id") || undefined;
  const previewOptions = useMemo<PreviewOptions>(() => ({ locale, device, sectionId }), [device, locale, sectionId]);
  const previewQuery = usePreviewSurveyQuery(surveyId, previewOptions);

  useEffect(() => {
    setStoreLocale(locale);
    setStoreDevice(device);
    setStoreActiveSectionId(sectionId);
  }, [device, locale, sectionId, setStoreActiveSectionId, setStoreDevice, setStoreLocale]);

  function updatePreviewOptions(nextOptions: Partial<PreviewOptions>) {
    const next = new URLSearchParams(searchParams);

    if (nextOptions.locale) next.set("locale", nextOptions.locale);
    if (nextOptions.device) next.set("device", nextOptions.device);
    if ("sectionId" in nextOptions) {
      if (nextOptions.sectionId) next.set("section_id", nextOptions.sectionId);
      else next.delete("section_id");
    }

    setSearchParams(next, { replace: true });
  }

  function resetSimulation() {
    setAnswers({});
  }

  if (!surveyId) {
    return (
      <section className="tg-preview-page">
        <ErrorState title="설문 ID가 없습니다." description="설문 목록에서 다시 진입해주세요." />
      </section>
    );
  }

  if (previewQuery.isPending) {
    return (
      <section className="tg-preview-page">
        <LoadingState label="미리보기를 불러오는 중" />
      </section>
    );
  }

  if (previewQuery.isError) {
    return (
      <section className="tg-preview-page">
        <ErrorState
          title="미리보기를 불러오지 못했습니다."
          description="설문 접근 권한 또는 Supabase 연결 상태를 확인해주세요."
          actionLabel="다시 시도"
          onAction={() => void previewQuery.refetch()}
        />
      </section>
    );
  }

  const survey = previewQuery.data.survey;
  const surveyTitle = localizedSurveyTitle(survey, locale);
  const sortedSections = sortByOrder(previewQuery.data.sections);
  const sortedQuestions = sortByOrder(previewQuery.data.questions);
  const activeSections = sectionId ? sortedSections.filter((section) => section.id === sectionId) : sortedSections;
  const issues = getPreviewIssues(sortedSections, sortedQuestions, previewQuery.data.assets, locale);
  const visibleQuestions = sortedQuestions.filter((question) => shouldShowQuestion({ question, questions: sortedQuestions, values: answers }));

  return (
    <section className="tg-preview-page" aria-labelledby="survey-preview-title">
      <header className="tg-preview-page__header">
        <div>
          <p className="tg-preview-page__eyebrow">참여자 화면 미리보기</p>
          <h1 id="survey-preview-title">{surveyTitle}</h1>
        </div>
        <div className="tg-preview-page__status">
          <StatusBadge tone="info">preview</StatusBadge>
          <SurveyStatusBadge status={survey.status} />
        </div>
      </header>

      <div className="tg-preview-toolbar" aria-label="미리보기 설정">
        <div className="tg-preview-toolbar__group" role="group" aria-label="언어">
          <button
            type="button"
            className={toggleClass(locale === "ko")}
            aria-pressed={locale === "ko"}
            onClick={() => updatePreviewOptions({ locale: "ko" })}
          >
            KO
          </button>
          <button
            type="button"
            className={toggleClass(locale === "en")}
            aria-pressed={locale === "en"}
            onClick={() => updatePreviewOptions({ locale: "en" })}
          >
            EN
          </button>
        </div>

        <div className="tg-preview-toolbar__group" role="group" aria-label="기기">
          <button
            type="button"
            className={toggleClass(device === "mobile")}
            aria-pressed={device === "mobile"}
            onClick={() => updatePreviewOptions({ device: "mobile" })}
          >
            <Smartphone size={15} aria-hidden="true" />
            Mobile
          </button>
          <button
            type="button"
            className={toggleClass(device === "desktop")}
            aria-pressed={device === "desktop"}
            onClick={() => updatePreviewOptions({ device: "desktop" })}
          >
            <Monitor size={15} aria-hidden="true" />
            Desktop
          </button>
        </div>

        <label className="tg-preview-toolbar__select">
          <span>섹션</span>
          <select value={sectionId ?? ""} onChange={(event) => updatePreviewOptions({ sectionId: event.target.value || undefined })}>
            <option value="">전체 섹션</option>
            {sortedSections.map((section) => (
              <option key={section.id} value={section.id}>
                {localizedText(section.title, locale)}
              </option>
            ))}
          </select>
        </label>

        <Button variant="ghost" icon={<RefreshCcw size={15} aria-hidden="true" />} onClick={resetSimulation}>
          초기화
        </Button>
      </div>

      <div className="tg-preview-page__workspace">
        <div className={`tg-preview-device tg-preview-device--${device}`} aria-label={`${device} 미리보기`}>
          <div className="tg-preview-device__screen">
            <article className="tg-participant-preview">
              <header className="tg-participant-preview__hero">
                <div className="tg-participant-preview__brand">
                  <Eye size={16} aria-hidden="true" />
                  <span>Taglow Survey</span>
                </div>
                <h2>{surveyTitle}</h2>
                {survey.description ? <p>{localizedText(survey.description, locale)}</p> : null}
              </header>

              {activeSections.length ? (
                activeSections.map((section) => (
                  <PreviewSection
                    key={section.id}
                    section={section}
                    questions={visibleQuestions.filter((question) => question.sectionId === section.id)}
                    assets={previewQuery.data.assets}
                    locale={locale}
                    answers={answers}
                    onAnswerChange={(questionId, answer) => setAnswers((current) => ({ ...current, [questionId]: answer }))}
                  />
                ))
              ) : (
                <EmptyState title="미리볼 섹션이 없습니다." description="빌더에서 섹션을 추가하면 이곳에 표시됩니다." />
              )}
            </article>
          </div>
        </div>

        <aside className="tg-preview-inspector" aria-label="미리보기 상태">
          <div className="tg-preview-inspector__block">
            <h2>검증</h2>
            {issues.length ? (
              <ul className="tg-preview-issue-list">
                {issues.map((issue) => (
                  <li key={issue.id} className={`tg-preview-issue tg-preview-issue--${issue.tone}`}>
                    {issue.tone === "danger" ? <AlertTriangle size={15} aria-hidden="true" /> : <CheckCircle2 size={15} aria-hidden="true" />}
                    <span>{issue.label}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="tg-preview-inspector__muted">현재 미리보기에서 감지된 경고가 없습니다.</p>
            )}
          </div>

          <div className="tg-preview-inspector__block">
            <h2>시뮬레이션</h2>
            <dl className="tg-preview-answer-list">
              <div>
                <dt>입력된 질문</dt>
                <dd>{Object.values(answers).filter(hasAnswer).length}</dd>
              </div>
              <div>
                <dt>표시 섹션</dt>
                <dd>{activeSections.length}</dd>
              </div>
              <div>
                <dt>표시 질문</dt>
                <dd>{activeSections.reduce((count, section) => count + visibleQuestions.filter((question) => question.sectionId === section.id).length, 0)}</dd>
              </div>
            </dl>
          </div>
        </aside>
      </div>
    </section>
  );
}

function PreviewSection(props: {
  section: SurveySection;
  questions: Question[];
  assets: SurveyAsset[];
  locale: Locale;
  answers: PreviewAnswers;
  onAnswerChange: (questionId: string, answer: PreviewAnswer | undefined) => void;
}) {
  return (
    <section className="tg-participant-section" aria-labelledby={`preview-section-${props.section.id}`}>
      <div className="tg-participant-section__header">
        <p>Section {props.section.orderIndex + 1}</p>
        <h3 id={`preview-section-${props.section.id}`}>{localizedText(props.section.title, props.locale)}</h3>
        {props.section.description ? <span>{localizedText(props.section.description, props.locale)}</span> : null}
      </div>

      {props.questions.length ? (
        <div className="tg-preview-question-stack">
          {props.questions.map((question) => (
            <PreviewQuestion
              key={question.id}
              question={question}
              assets={props.assets}
              locale={props.locale}
              answer={props.answers[question.id]}
              onAnswerChange={(answer) => props.onAnswerChange(question.id, answer)}
            />
          ))}
        </div>
      ) : (
        <EmptyState title="이 섹션에는 표시할 질문이 없습니다." description="분기 조건 또는 섹션 구성을 확인해주세요." />
      )}
    </section>
  );
}

function PreviewQuestion(props: {
  question: Question;
  assets: SurveyAsset[];
  locale: Locale;
  answer: PreviewAnswer | undefined;
  onAnswerChange: (answer: PreviewAnswer | undefined) => void;
}) {
  return (
    <article className="tg-preview-question">
      <header className="tg-preview-question__header">
        <div>
          <p>{props.question.questionKey}</p>
          <h4>
            {localizedText(props.question.title, props.locale)}
            {props.question.isRequired ? <span className="tg-preview-question__required" aria-label="필수"> *</span> : null}
          </h4>
          {props.question.description ? <span>{localizedText(props.question.description, props.locale)}</span> : null}
        </div>
        <div className="tg-preview-question__badges">
          <StatusBadge tone="info">{formatPreviewQuestionType(props.question)}</StatusBadge>
        </div>
      </header>

      <QuestionControl {...props} />
    </article>
  );
}

function QuestionControl(props: {
  question: Question;
  assets: SurveyAsset[];
  locale: Locale;
  answer: PreviewAnswer | undefined;
  onAnswerChange: (answer: PreviewAnswer | undefined) => void;
}) {
  if (props.question.questionType === "scale" || props.question.questionType === "attention_check") {
    return <ScaleControl {...props} />;
  }

  if (props.question.questionType === "single_choice" || props.question.questionType === "experience") {
    return <SingleChoiceControl {...props} options={getChoiceOptions(props.question)} />;
  }

  if (props.question.questionType === "multi_select" || props.question.questionType === "matrix_multi_select") {
    return <MultiSelectControl {...props} options={getChoiceOptions(props.question)} />;
  }

  if (props.question.questionType === "ranking") {
    return <RankingControl {...props} options={getChoiceOptions(props.question)} />;
  }

  if (props.question.questionType === "image_tag") {
    return <ImageTagControl {...props} />;
  }

  if (props.question.questionType === "participant_image_tag") {
    return <ParticipantImageTagControl {...props} />;
  }

  if (getQuestionKind(props.question) === "short_text") {
    return <ShortTextControl {...props} />;
  }

  if (getQuestionKind(props.question) === "choice_text") {
    return <ChoiceTextControl {...props} options={getChoiceOptions(props.question)} />;
  }

  return (
    <label className="tg-preview-field">
      <span>답변</span>
      <textarea
        rows={4}
        value={typeof props.answer === "string" ? props.answer : ""}
        onChange={(event) => props.onAnswerChange(event.target.value || undefined)}
      />
    </label>
  );
}

function ShortTextControl(props: {
  question: Question;
  answer: PreviewAnswer | undefined;
  onAnswerChange: (answer: PreviewAnswer | undefined) => void;
}) {
  const maxLength = getNumber(toRecord(props.question.config).maxLength);
  return (
    <label className="tg-preview-field">
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

function ChoiceTextControl(props: {
  question: Question;
  locale: Locale;
  answer: PreviewAnswer | undefined;
  options: ChoiceOption[];
  onAnswerChange: (answer: PreviewAnswer | undefined) => void;
}) {
  const answer = isChoiceTextAnswer(props.answer) ? props.answer : {};

  return (
    <div className="tg-preview-choice-text">
      <div className="tg-preview-choice-list">
        {props.options.map((option) => (
          <label key={option.value} className="tg-preview-choice">
            <input
              type="radio"
              name={`preview-choice-text-${props.question.id}`}
              checked={answer.choiceValue === option.value}
              onChange={() => props.onAnswerChange({ ...answer, choiceValue: option.value })}
            />
            <span>{localizedOption(option, props.locale)}</span>
          </label>
        ))}
      </div>
      <label className="tg-preview-field">
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

function ScaleControl(props: {
  question: Question;
  locale: Locale;
  answer: PreviewAnswer | undefined;
  onAnswerChange: (answer: PreviewAnswer | undefined) => void;
}) {
  const { min, max } = getScaleBounds(props.question);
  const labels = getScaleLabels(props.question, props.locale);
  const values = Array.from({ length: Math.max(1, max - min + 1) }, (_, index) => min + index);

  return (
    <div className="tg-preview-scale" role="radiogroup" aria-label={localizedText(props.question.title, props.locale)}>
      {values.map((value, index) => (
        <button
          key={value}
          type="button"
          className={`tg-preview-scale__item ${props.answer === value ? "tg-preview-scale__item--active" : ""}`}
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

function SingleChoiceControl(props: {
  question: Question;
  locale: Locale;
  answer: PreviewAnswer | undefined;
  options: ChoiceOption[];
  onAnswerChange: (answer: PreviewAnswer | undefined) => void;
}) {
  const options = props.options.length ? props.options : getExperienceFallbackOptions();

  return (
    <div className="tg-preview-choice-list" role="radiogroup" aria-label={localizedText(props.question.title, props.locale)}>
      {options.map((option) => (
        <label key={option.value} className="tg-preview-choice">
          <input
            type="radio"
            name={`preview-${props.question.id}`}
            checked={props.answer === option.value}
            onChange={() => props.onAnswerChange(option.value)}
          />
          <span>{localizedOption(option, props.locale)}</span>
        </label>
      ))}
    </div>
  );
}

function MultiSelectControl(props: {
  question: Question;
  locale: Locale;
  answer: PreviewAnswer | undefined;
  options: ChoiceOption[];
  onAnswerChange: (answer: PreviewAnswer | undefined) => void;
}) {
  const matrix = getChoiceMatrix(props.question);
  const selected = Array.isArray(props.answer) ? props.answer.filter((value): value is string => typeof value === "string") : [];
  const maxSelect = getMaxSelect(props.question);

  if (matrix) {
    return (
      <MultiSelectMatrixControl
        matrix={matrix}
        locale={props.locale}
        selected={selected}
        maxSelect={maxSelect}
        onSelectedChange={(next) => props.onAnswerChange(next.length ? next : undefined)}
      />
    );
  }

  return (
    <div className="tg-preview-choice-list">
      <p className="tg-preview-choice-list__meta">
        {selected.length}개 선택됨{maxSelect ? ` · 최대 ${maxSelect}개` : ""}
      </p>
      <div className="tg-preview-choice-list__options">
        {props.options.map((option) => {
          const checked = selected.includes(option.value);
          const disabled = Boolean(maxSelect && !checked && selected.length >= maxSelect);
          return (
            <label key={option.value} className="tg-preview-choice">
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
    </div>
  );
}

function MultiSelectMatrixControl(props: {
  matrix: NonNullable<ReturnType<typeof getChoiceMatrix>>;
  locale: Locale;
  selected: string[];
  maxSelect: number | undefined;
  onSelectedChange: (selected: string[]) => void;
}) {
  const optionByValue = new Map(props.matrix.options.map((option) => [option.value, option] as const));
  return (
    <div className="tg-preview-choice-matrix-wrap">
      <p className="tg-preview-choice-list__meta">
        {props.selected.length}개 선택됨{props.maxSelect ? ` · 최대 ${props.maxSelect}개` : ""}
      </p>
      <table className="tg-preview-choice-matrix">
        <thead>
          <tr>
            <th scope="col">행</th>
            {props.matrix.columns.map((column) => (
              <th key={column.value} scope="col">
                {localizedOption(column, props.locale)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {props.matrix.rows.map((row) => (
            <tr key={row.value}>
              <th scope="row">{localizedOption(row, props.locale)}</th>
              {props.matrix.columns.map((column) => {
                const value = buildChoiceMatrixOptions([row], [column], props.matrix.valueSeparator)[0]?.value ?? `${column.value}_${row.value}`;
                const option = optionByValue.get(value);
                const checked = props.selected.includes(value);
                const disabled = Boolean(props.maxSelect && !checked && props.selected.length >= props.maxSelect);
                return (
                  <td key={value}>
                    <label className="tg-preview-choice-matrix__cell">
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={disabled}
                        aria-label={option ? localizedOption(option, props.locale) : `${localizedOption(column, props.locale)} - ${localizedOption(row, props.locale)}`}
                        onChange={(event) => {
                          const next = event.target.checked
                            ? [...props.selected, value]
                            : props.selected.filter((item) => item !== value);
                          props.onSelectedChange(next);
                        }}
                      />
                    </label>
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

function RankingControl(props: {
  question: Question;
  locale: Locale;
  answer: PreviewAnswer | undefined;
  options: ChoiceOption[];
  onAnswerChange: (answer: PreviewAnswer | undefined) => void;
}) {
  const ranking = isRankingAnswer(props.answer) ? props.answer : {};
  const ranks = Array.from({ length: props.options.length }, (_, index) => index + 1);

  return (
    <div className="tg-preview-ranking">
      {props.options.map((option) => (
        <label key={option.value} className="tg-preview-ranking__row">
          <span>{localizedOption(option, props.locale)}</span>
          <select
            aria-label={`${localizedOption(option, props.locale)} 순위`}
            value={ranking[option.value] ?? ""}
            onChange={(event) => {
              const nextValue = event.target.value ? Number(event.target.value) : undefined;
              const next = { ...ranking, [option.value]: nextValue };
              props.onAnswerChange(Object.values(next).some(Boolean) ? next : undefined);
            }}
          >
            <option value="">-</option>
            {ranks.map((rank) => (
              <option key={rank} value={rank}>
                {rank}
              </option>
            ))}
          </select>
        </label>
      ))}
    </div>
  );
}

function ImageTagControl(props: {
  question: Question;
  assets: SurveyAsset[];
  locale: Locale;
  answer: PreviewAnswer | undefined;
  onAnswerChange: (answer: PreviewAnswer | undefined) => void;
}) {
  const assetId = getConfiguredAssetId(props.question);
  const asset = props.assets.find((item) => item.id === assetId);
  const tags = isImageTagAnswer(props.answer) ? props.answer : [];
  const maxTags = getMaxTags(props.question);
  const imageUrl = getAssetUrl(asset);
  const tagOptions = getLocalizedTagTypeOptions(props.question, props.locale);

  return (
    <div className="tg-preview-image-tag">
      <button
        type="button"
        className="tg-preview-image-tag__surface"
        aria-label="위치 선택 영역"
        disabled={!assetId || tags.length >= maxTags}
        onClick={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          const xRatio = ratioFromPoint(event.clientX - rect.left, rect.width);
          const yRatio = ratioFromPoint(event.clientY - rect.top, rect.height);
          props.onAnswerChange([...tags, { id: crypto.randomUUID(), xRatio, yRatio, tagType: tagOptions[0]?.value }]);
        }}
      >
        {imageUrl ? <img src={imageUrl} alt="" /> : <span className="tg-preview-image-tag__placeholder">{asset?.storagePath ?? "선택할 이미지를 불러오지 못했습니다."}</span>}
        {tags.map((tag, index) => (
          <span
            key={tag.id}
            className="tg-preview-image-tag__pin"
            style={{ left: `${tag.xRatio * 100}%`, top: `${tag.yRatio * 100}%` }}
          >
            {index + 1}
          </span>
        ))}
      </button>
      <p>
        <MousePointer2 size={14} aria-hidden="true" />
        <span>위치 {tags.length} / {maxTags}</span>
      </p>
      {tags.length && tagOptions.length ? (
        <div className="tg-preview-ranking">
          {tags.map((tag, index) => (
            <label key={tag.id} className="tg-preview-ranking__row">
              <span>태그 {index + 1}</span>
              <select
                aria-label={`태그 ${index + 1} 카테고리`}
                value={tag.tagType ?? tagOptions[0]?.value}
                onChange={(event) =>
                  props.onAnswerChange(tags.map((item) => (item.id === tag.id ? { ...item, tagType: event.target.value } : item)))
                }
              >
                {tagOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {localizedOption(option, props.locale)}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ParticipantImageTagControl(props: {
  question: Question;
  locale: Locale;
  answer: PreviewAnswer | undefined;
  onAnswerChange: (answer: PreviewAnswer | undefined) => void;
}) {
  const config = toRecord(props.question.config);
  const answer = isParticipantImageTagAnswer(props.answer) ? props.answer : { tags: [] };
  const tags = answer.tags;
  const maxTags = getMaxTags(props.question);
  const tagOptions = getLocalizedTagTypeOptions(props.question, props.locale);

  return (
    <div className="tg-preview-participant-image-tag">
      <label className="tg-preview-upload-button">
        <Upload size={14} aria-hidden="true" />
        <span>{answer.imageUrl ? "사진 다시 선택" : "사진 선택"}</span>
        <input
          aria-label="사진 선택"
          type="file"
          accept="image/*"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (!file) return;
            props.onAnswerChange({ imageUrl: URL.createObjectURL(file), fileName: file.name, tags: [] });
          }}
        />
      </label>
      <div className="tg-preview-image-tag">
        <button
          type="button"
          className="tg-preview-image-tag__surface"
          aria-label="위치 선택 영역"
          disabled={!answer.imageUrl || tags.length >= maxTags}
          onClick={(event) => {
            const rect = event.currentTarget.getBoundingClientRect();
            const xRatio = ratioFromPoint(event.clientX - rect.left, rect.width);
            const yRatio = ratioFromPoint(event.clientY - rect.top, rect.height);
            props.onAnswerChange({ ...answer, tags: [...tags, { id: crypto.randomUUID(), xRatio, yRatio, tagType: tagOptions[0]?.value }] });
          }}
        >
          {answer.imageUrl ? <img src={answer.imageUrl} alt="" /> : <span className="tg-preview-image-tag__placeholder">사진을 올리면 위치를 선택할 수 있습니다.</span>}
          {tags.map((tag, index) => (
            <span
              key={tag.id}
              className="tg-preview-image-tag__pin"
              style={{ left: `${tag.xRatio * 100}%`, top: `${tag.yRatio * 100}%` }}
            >
              {index + 1}
            </span>
          ))}
        </button>
        <p>
          <MousePointer2 size={14} aria-hidden="true" />
          <span>위치 {tags.length} / {maxTags}</span>
          {answer.fileName ? <span>{answer.fileName}</span> : null}
        </p>
        {tags.length && tagOptions.length ? (
          <div className="tg-preview-ranking">
            {tags.map((tag, index) => (
              <label key={tag.id} className="tg-preview-ranking__row">
                <span>태그 {index + 1}</span>
                <select
                  aria-label={`태그 ${index + 1} 카테고리`}
                  value={tag.tagType ?? tagOptions[0]?.value}
                  onChange={(event) =>
                    props.onAnswerChange({
                      ...answer,
                      tags: tags.map((item) => (item.id === tag.id ? { ...item, tagType: event.target.value } : item)),
                    })
                  }
                >
                  {tagOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {localizedOption(option, props.locale)}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function normalizeLocale(value: string | null): Locale {
  return value === "en" ? "en" : "ko";
}

function normalizeDevice(value: string | null): PreviewDevice {
  return value === "desktop" ? "desktop" : "mobile";
}

function toggleClass(active: boolean): string {
  return ["tg-preview-toggle", active ? "tg-preview-toggle--active" : ""].filter(Boolean).join(" ");
}

function hasAnswer(answer: PreviewAnswer | undefined): boolean {
  if (answer === undefined || answer === "") return false;
  if (Array.isArray(answer)) return answer.length > 0;
  if (isChoiceTextAnswer(answer)) return Boolean(answer.choiceValue || answer.text);
  if (isRankingAnswer(answer)) return Object.values(answer).some((value) => value !== undefined);
  return true;
}

function isRankingAnswer(value: unknown): value is RankingAnswer {
  return isRecord(value) && Object.values(value).every((item) => item === undefined || typeof item === "number");
}

function isImageTagAnswer(value: unknown): value is ImageTagDraft[] {
  return Array.isArray(value) && value.every((item) => isRecord(item) && typeof item.xRatio === "number" && typeof item.yRatio === "number");
}

function isParticipantImageTagAnswer(value: unknown): value is ParticipantImageTagDraft {
  return isRecord(value) && Array.isArray(value.tags);
}

function isChoiceTextAnswer(value: unknown): value is ChoiceTextPreviewAnswer {
  return isRecord(value) && !Array.isArray(value.tags) && ("choiceValue" in value || "text" in value);
}

function formatPreviewQuestionType(question: Question): string {
  if (getQuestionKind(question) === "short_text") return "단답형";
  if (getQuestionKind(question) === "choice_text") return "선택후 주관식";
  if (question.questionType === "single_choice") return "단일 선택";
  if (question.questionType === "multi_select") return "복수 선택";
  if (question.questionType === "matrix_multi_select") return "행/열 복수 선택";
  if (question.questionType === "text") return "주관식";
  if (question.questionType === "image_tag") return "위치 선택";
  if (question.questionType === "participant_image_tag") return "사진 위치 선택";
  if (question.questionType === "scale") return "척도";
  return question.questionType;
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
