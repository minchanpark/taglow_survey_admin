import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Copy,
  FilePlus2,
  FileText,
  ImageIcon,
  Loader2,
  Plus,
  Save,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { MouseEventHandler, ReactNode } from "react";
import { useForm } from "react-hook-form";
import { useParams } from "react-router-dom";
import { z } from "zod";
import {
  useCreateQuestionMutation,
  useCreateSectionMutation,
  useDeleteQuestionMutation,
  useDeleteSectionMutation,
  useImportQuestionSetMutation,
  useQuestionSetImportPreviewQuery,
  useReorderQuestionsMutation,
  useReorderSectionsMutation,
  useSurveyDetailQuery,
  useUpdateSurveyMutation,
  useUpdateQuestionMutation,
  useUpdateSectionMutation,
  useUploadSurveyImageMutation,
} from "../../../api/admin/query";
import { canEditSurvey, getChoiceOptions as getNormalizedChoiceOptions } from "../../../api/admin/model";
import type {
  JsonRecord,
  LocalizedText,
  MetricType,
  Question,
  QuestionConfig,
  QuestionSetImportPreview,
  QuestionSetTemplateId,
  QuestionType,
  SectionType,
  Survey,
  SurveyAsset,
  SurveySection,
} from "../../../api/admin/model";
import { Button, EmptyState, ErrorState, LoadingState, StatusBadge } from "../../../components";
import { useAdminBuilderStore } from "../../../store";
import "./css/SurveyBuilderPage.css";

const questionSetTemplateId: QuestionSetTemplateId = "handong-dom-survey-2026-1";
const shortTextQuestionKind = "short_text" as const;
const choiceTextQuestionKind = "choice_text" as const;

type QuestionKind = QuestionType | typeof shortTextQuestionKind | typeof choiceTextQuestionKind;

const sectionTypes: Array<{ value: SectionType; label: string }> = [
  { value: "general", label: "일반" },
  { value: "profile", label: "기본 정보" },
  { value: "intro", label: "인트로" },
  { value: "facility", label: "생활관 시설" },
  { value: "laundry", label: "세탁/건조" },
  { value: "global_lounge", label: "글로벌 라운지" },
  { value: "identity", label: "제출자 정보" },
  { value: "completion", label: "완료" },
  { value: "satisfaction", label: "만족도" },
  { value: "space_tagging", label: "공간 태깅" },
  { value: "free_text", label: "주관식" },
  { value: "submitter", label: "제출" },
];

const visibleQuestionTypes: Array<{ value: QuestionKind; label: string }> = [
  { value: "scale", label: "척도" },
  { value: "single_choice", label: "단일 선택" },
  { value: "multi_select", label: "복수 선택" },
  { value: shortTextQuestionKind, label: "단답형" },
  { value: "text", label: "주관식" },
  { value: choiceTextQuestionKind, label: "선택후 주관식" },
  { value: "attention_check", label: "주의 확인" },
  { value: "image_tag", label: "이미지 태깅" },
  { value: "participant_image_tag", label: "태깅 건의" },
];

const legacyQuestionTypes: Array<{ value: QuestionType; label: string }> = [
  { value: "profile", label: "기본 정보" },
  { value: "experience", label: "경험 여부" },
  { value: "ranking", label: "순위" },
];

const allQuestionKinds: Array<{ value: QuestionKind; label: string }> = [...visibleQuestionTypes, ...legacyQuestionTypes];

const defaultChoiceTextOptions = [
  { value: "complaint", labelKo: "불편" },
  { value: "improvement", labelKo: "개선" },
  { value: "praise", labelKo: "칭찬" },
  { value: "inquiry", labelKo: "문의" },
  { value: "other", labelKo: "기타" },
];

const metricTypes: Array<{ value: MetricType; label: string }> = [
  { value: "none", label: "없음" },
  { value: "satisfaction", label: "만족도" },
  { value: "importance", label: "중요도" },
  { value: "experience", label: "경험" },
];

const profileFieldOptions = [
  { value: "gender", label: "성별" },
  { value: "semester_group", label: "학기" },
  { value: "department", label: "학부/전공" },
  { value: "rc", label: "RC" },
  { value: "dormitory", label: "생활관" },
  { value: "room_type", label: "인실" },
  { value: "dorm_experience", label: "거주 경험" },
  { value: "student_number", label: "학번" },
  { value: "name", label: "이름" },
];

const keyRegex = /^[a-z0-9_]*$/;

const createSectionSchema = z.object({
  titleKo: z.string().trim().min(1, "섹션 제목을 입력해주세요.").max(120, "섹션 제목은 120자 이하로 입력해주세요."),
  sectionKey: z.string().trim().max(80, "섹션 키는 80자 이하로 입력해주세요.").regex(keyRegex, "영문 소문자, 숫자, 밑줄만 사용할 수 있습니다.").optional(),
  sectionType: z.custom<SectionType>((value) => sectionTypes.some((type) => type.value === value), "섹션 유형을 선택해주세요."),
});

const editSectionSchema = z.object({
  sectionKey: z.string().trim().max(80, "섹션 키는 80자 이하로 입력해주세요.").regex(keyRegex, "영문 소문자, 숫자, 밑줄만 사용할 수 있습니다.").optional(),
  titleKo: z.string().trim().min(1, "섹션 제목을 입력해주세요.").max(120, "섹션 제목은 120자 이하로 입력해주세요."),
  titleEn: z.string().trim().max(120, "영문 제목은 120자 이하로 입력해주세요.").optional(),
  descriptionKo: z.string().trim().max(500, "설명은 500자 이하로 입력해주세요.").optional(),
  descriptionEn: z.string().trim().max(500, "영문 설명은 500자 이하로 입력해주세요.").optional(),
  sectionType: z.custom<SectionType>((value) => sectionTypes.some((type) => type.value === value), "섹션 유형을 선택해주세요."),
});

const editSurveySchema = z.object({
  title: z.string().trim().min(1, "설문 제목을 입력해주세요.").max(120, "설문 제목은 120자 이하로 입력해주세요."),
  descriptionKo: z.string().trim().max(800, "소개 문구는 800자 이하로 입력해주세요.").optional(),
  descriptionEn: z.string().trim().optional(),
});

const createQuestionSchema = z
  .object({
    createMode: z.enum(["single", "group"]),
    titleKo: z.string().trim().max(220, "질문 제목은 220자 이하로 입력해주세요.").optional(),
    displayGroup: z.string().trim().max(220, "큰 질문은 220자 이하로 입력해주세요.").optional(),
    groupTitleKo: z.string().trim().max(220, "큰 질문은 220자 이하로 입력해주세요.").optional(),
    groupItems: z.string().trim().max(2000, "세부 항목은 2000자 이하로 입력해주세요.").optional(),
    questionKey: z.string().trim().max(80, "질문 키는 80자 이하로 입력해주세요.").regex(keyRegex, "영문 소문자, 숫자, 밑줄만 사용할 수 있습니다.").optional(),
    questionKeyPrefix: z
      .string()
      .trim()
      .max(60, "질문 키 접두어는 60자 이하로 입력해주세요.")
      .regex(keyRegex, "영문 소문자, 숫자, 밑줄만 사용할 수 있습니다.")
      .optional(),
    questionType: z.custom<QuestionKind>((value) => visibleQuestionTypes.some((type) => type.value === value), "질문 유형을 선택해주세요."),
  })
  .superRefine((values, context) => {
    if (values.createMode === "single" && !values.titleKo?.trim()) {
      context.addIssue({ code: "custom", path: ["titleKo"], message: "질문 제목을 입력해주세요." });
    }
    if (values.createMode === "group") {
      if (!values.groupTitleKo?.trim()) {
        context.addIssue({ code: "custom", path: ["groupTitleKo"], message: "큰 질문을 입력해주세요." });
      }
      if (splitLines(values.groupItems ?? "").length < 2) {
        context.addIssue({ code: "custom", path: ["groupItems"], message: "세부 항목을 두 개 이상 입력해주세요." });
      }
    }
  });

const editQuestionSchema = z.object({
  questionKey: z.string().trim().max(80, "질문 키는 80자 이하로 입력해주세요.").regex(keyRegex, "영문 소문자, 숫자, 밑줄만 사용할 수 있습니다.").optional(),
  titleKo: z.string().trim().min(1, "질문 제목을 입력해주세요.").max(220, "질문 제목은 220자 이하로 입력해주세요."),
  titleEn: z.string().trim().max(220, "영문 제목은 220자 이하로 입력해주세요.").optional(),
  descriptionKo: z.string().trim().max(500, "설명은 500자 이하로 입력해주세요.").optional(),
  descriptionEn: z.string().trim().max(500, "영문 설명은 500자 이하로 입력해주세요.").optional(),
  questionType: z.custom<QuestionKind>((value) => allQuestionKinds.some((type) => type.value === value), "질문 유형을 선택해주세요."),
  isRequired: z.boolean(),
  metricType: z.custom<MetricType>((value) => metricTypes.some((type) => type.value === value), "분석 지표를 선택해주세요."),
  topicKey: z.string().trim().max(80, "topic key는 80자 이하로 입력해주세요.").optional(),
  spaceKey: z.string().trim().max(80, "space key는 80자 이하로 입력해주세요.").optional(),
  configJson: z.string().refine((value) => parseJsonRecord(value) !== null, "config는 JSON object 형식이어야 합니다."),
});

type CreateSectionForm = z.infer<typeof createSectionSchema>;
type EditSectionForm = z.infer<typeof editSectionSchema>;
type EditSurveyForm = z.infer<typeof editSurveySchema>;
type CreateQuestionForm = z.infer<typeof createQuestionSchema>;
type EditQuestionForm = z.infer<typeof editQuestionSchema>;

function defaultCreateQuestionForm(displayGroup = ""): CreateQuestionForm {
  return {
    createMode: "single",
    titleKo: "",
    displayGroup,
    groupTitleKo: displayGroup,
    groupItems: "",
    questionKey: "",
    questionKeyPrefix: "",
    questionType: "scale",
  };
}

export function SurveyBuilderPage() {
  const { surveyId = "" } = useParams();
  const detailQuery = useSurveyDetailQuery(surveyId);
  const [isImportOpen, setImportOpen] = useState(false);
  const {
    selectedSectionId,
    selectedQuestionId,
    questionCreatePlacement,
    setSelectedSurveyId,
    setSelectedSectionId,
    setSelectedQuestionId,
    startQuestionCreate,
    clearQuestionCreate,
  } = useAdminBuilderStore();

  const sections = useMemo(
    () => [...(detailQuery.data?.sections ?? [])].sort((a, b) => a.orderIndex - b.orderIndex),
    [detailQuery.data?.sections],
  );
  const questions = useMemo(
    () => [...(detailQuery.data?.questions ?? [])].sort((a, b) => a.orderIndex - b.orderIndex),
    [detailQuery.data?.questions],
  );
  const selectedSection = sections.find((section) => section.id === selectedSectionId);
  const sectionQuestions = useMemo(
    () => (selectedSection ? questions.filter((question) => question.sectionId === selectedSection.id) : []),
    [questions, selectedSection],
  );
  const selectedQuestion = sectionQuestions.find((question) => question.id === selectedQuestionId);
  const isStructureLocked = detailQuery.data?.survey.status === "archived";

  useEffect(() => {
    setSelectedSurveyId(surveyId || undefined);
  }, [setSelectedSurveyId, surveyId]);

  useEffect(() => {
    if (!sections.length) {
      if (selectedSectionId) setSelectedSectionId(undefined);
      return;
    }
    if (!selectedSectionId || !sections.some((section) => section.id === selectedSectionId)) {
      setSelectedSectionId(sections[0]?.id);
    }
  }, [sections, selectedSectionId, setSelectedSectionId]);

  useEffect(() => {
    if (!sectionQuestions.length) {
      if (selectedQuestionId) setSelectedQuestionId(undefined);
      return;
    }
    if (selectedQuestionId && !sectionQuestions.some((question) => question.id === selectedQuestionId)) {
      setSelectedQuestionId(undefined);
    }
  }, [sectionQuestions, selectedQuestionId, setSelectedQuestionId]);

  if (!surveyId) {
    return (
      <section className="tg-builder-page">
        <ErrorState title="설문 ID가 없습니다." description="설문 목록에서 다시 진입해주세요." />
      </section>
    );
  }

  if (detailQuery.isPending) {
    return (
      <section className="tg-builder-page">
        <LoadingState label="설문 빌더를 불러오는 중" />
      </section>
    );
  }

  if (detailQuery.isError) {
    return (
      <section className="tg-builder-page">
        <ErrorState
          title="설문 빌더를 불러오지 못했습니다."
          description="설문 접근 권한 또는 Supabase 연결 상태를 확인해주세요."
          actionLabel="다시 시도"
          onAction={() => void detailQuery.refetch()}
        />
      </section>
    );
  }

  if (!canEditSurvey(detailQuery.data.survey.accessRole)) {
    return (
      <section className="tg-builder-page">
        <ErrorState title="설문을 수정할 수 없습니다." description="이 설문은 결과 보기 권한으로 공유되었습니다. 미리보기와 분석 화면을 이용해주세요." />
      </section>
    );
  }

  return (
    <section className="tg-builder-page" aria-labelledby="survey-builder-title">
      <header className="tg-builder-page__header">
        <SurveyTitleEditor survey={detailQuery.data.survey} isDisabled={isStructureLocked} />
        <div className="tg-builder-page__header-actions">
          <StatusBadge tone={detailQuery.data.survey.status}>{detailQuery.data.survey.status}</StatusBadge>
          <Button
            variant="secondary"
            icon={<FileText size={16} aria-hidden="true" />}
            disabled={isStructureLocked}
            onClick={() => setImportOpen(true)}
          >
            질문 목록 불러오기
          </Button>
        </div>
      </header>

      {isStructureLocked ? (
        <InlineAlert message="보관된 설문은 편집이 제한됩니다." detail="다시 수정해야 한다면 새 설문 또는 최신 버전에서 작업해주세요." />
      ) : null}

      <div className="tg-builder-page__workspace">
        <SectionPanel
          surveyId={surveyId}
          sections={sections}
          questions={questions}
          selectedSection={selectedSection}
          isStructureLocked={isStructureLocked}
          onSelectSection={(sectionId) => setSelectedSectionId(sectionId)}
          onStartQuestion={(sectionId) => {
            startQuestionCreate(sectionId);
          }}
        />
        <QuestionPanel
          surveyId={surveyId}
          selectedSection={selectedSection}
          questions={sectionQuestions}
          selectedQuestion={selectedQuestion}
          isStructureLocked={isStructureLocked}
          onSelectQuestion={(questionId) => setSelectedQuestionId(questionId)}
          onStartQuestion={(sectionId, afterQuestionId) => startQuestionCreate(sectionId, afterQuestionId)}
        />
        <QuestionEditor
          surveyId={surveyId}
          selectedSection={selectedSection}
          questions={sectionQuestions}
          question={selectedQuestion}
          createPlacement={questionCreatePlacement?.sectionId === selectedSection?.id ? questionCreatePlacement : undefined}
          assets={detailQuery.data.assets}
          isStructureLocked={isStructureLocked}
          onCancelCreate={clearQuestionCreate}
          onQuestionCreated={(questionId) => setSelectedQuestionId(questionId)}
        />
      </div>

      {isImportOpen ? <QuestionSetImportDialog surveyId={surveyId} onClose={() => setImportOpen(false)} /> : null}
    </section>
  );
}

function SurveyTitleEditor(props: { survey: Survey; isDisabled: boolean }) {
  const updateSurveyMutation = useUpdateSurveyMutation();
  const [savedTitle, setSavedTitle] = useState(props.survey.title);
  const [savedDescriptionKo, setSavedDescriptionKo] = useState(props.survey.description?.ko ?? "");
  const [savedDescriptionEn, setSavedDescriptionEn] = useState(props.survey.description?.en ?? "");
  const titleForm = useForm<EditSurveyForm>({
    resolver: zodResolver(editSurveySchema),
    defaultValues: surveyToTitleForm(props.survey),
  });
  const titleValue = titleForm.watch("title");
  const descriptionKoValue = titleForm.watch("descriptionKo") ?? "";
  const descriptionEnValue = titleForm.watch("descriptionEn") ?? "";
  const normalizedTitle = titleValue.trim();
  const normalizedDescriptionKo = descriptionKoValue.trim();
  const normalizedDescriptionEn = descriptionEnValue.trim();
  const isUnchanged = normalizedTitle === savedTitle && normalizedDescriptionKo === savedDescriptionKo && normalizedDescriptionEn === savedDescriptionEn;
  const isBusy = props.isDisabled || updateSurveyMutation.isPending;

  useEffect(() => {
    setSavedTitle(props.survey.title);
    setSavedDescriptionKo(props.survey.description?.ko ?? "");
    setSavedDescriptionEn(props.survey.description?.en ?? "");
    titleForm.reset(surveyToTitleForm(props.survey));
  }, [props.survey.description, props.survey.title, titleForm]);

  return (
    <div className="tg-builder-title-block">
      <p className="tg-builder-page__eyebrow">설문 빌더</p>
      <h1 id="survey-builder-title" className="tg-builder-visually-hidden">
        {savedTitle}
      </h1>
      <form
        className="tg-builder-title-form"
        aria-label="설문 제목 편집"
        onSubmit={titleForm.handleSubmit((values) => {
          updateSurveyMutation.mutate(
            {
              surveyId: props.survey.id,
              title: values.title.trim(),
              description: toOptionalLocalizedText(values.descriptionKo, values.descriptionEn),
            },
            {
              onSuccess: (survey) => {
                setSavedTitle(survey.title);
                setSavedDescriptionKo(survey.description?.ko ?? "");
                setSavedDescriptionEn(survey.description?.en ?? "");
                titleForm.reset(surveyToTitleForm(survey));
              },
            },
          );
        })}
      >
        <label className="tg-builder-title-form__field">
          <span>설문 제목</span>
          <input aria-label="설문 제목" {...titleForm.register("title")} disabled={isBusy} />
        </label>
        <label className="tg-builder-title-form__field tg-builder-title-form__field--intro">
          <span>한국어 소개 문구</span>
          <textarea
            aria-label="한국어 소개 문구"
            rows={3}
            placeholder="예: 이번 설문은 생활관 이용 경험을 더 정확히 파악하기 위해 진행됩니다."
            {...titleForm.register("descriptionKo")}
            disabled={isBusy}
          />
          <small className="tg-builder-title-form__help">URL을 입력하면 참여자 화면에서 자동 링크로 표시됩니다.</small>
        </label>
        <label className="tg-builder-title-form__field tg-builder-title-form__field--intro">
          <span>영어 소개 문구</span>
          <textarea
            aria-label="영어 소개 문구"
            rows={3}
            placeholder="Example: This survey helps us better understand your dormitory experience."
            {...titleForm.register("descriptionEn")}
            disabled={isBusy}
          />
        </label>
        <div className="tg-builder-title-form__actions">
          <Button type="submit" variant="primary" icon={<Save size={16} aria-hidden="true" />} disabled={isBusy || isUnchanged}>
            기본 정보 저장
          </Button>
        </div>
      </form>
      {titleForm.formState.errors.title ? <small className="tg-builder-title-form__error">{titleForm.formState.errors.title.message}</small> : null}
      {titleForm.formState.errors.descriptionKo ? <small className="tg-builder-title-form__error">{titleForm.formState.errors.descriptionKo.message}</small> : null}
      {titleForm.formState.errors.descriptionEn ? <small className="tg-builder-title-form__error">{titleForm.formState.errors.descriptionEn.message}</small> : null}
      {updateSurveyMutation.isError ? (
        <InlineAlert message="설문 기본 정보를 저장하지 못했습니다." detail={getErrorDetail(updateSurveyMutation.error)} />
      ) : null}
      {updateSurveyMutation.isSuccess ? <InlineNotice message="설문 기본 정보가 저장되었습니다." /> : null}
    </div>
  );
}

function SectionPanel(props: {
  surveyId: string;
  sections: SurveySection[];
  questions: Question[];
  selectedSection?: SurveySection;
  isStructureLocked: boolean;
  onSelectSection: (sectionId: string) => void;
  onStartQuestion: (sectionId: string) => void;
}) {
  const createSectionMutation = useCreateSectionMutation();
  const updateSectionMutation = useUpdateSectionMutation();
  const deleteSectionMutation = useDeleteSectionMutation();
  const reorderSectionsMutation = useReorderSectionsMutation();
  const setSelectedSectionId = useAdminBuilderStore((state) => state.setSelectedSectionId);
  const createForm = useForm<CreateSectionForm>({
    resolver: zodResolver(createSectionSchema),
    defaultValues: { titleKo: "", sectionKey: "", sectionType: "general" },
  });
  const editForm = useForm<EditSectionForm>({
    resolver: zodResolver(editSectionSchema),
    defaultValues: sectionToEditForm(props.selectedSection),
  });

  useEffect(() => {
    editForm.reset(sectionToEditForm(props.selectedSection));
  }, [editForm, props.selectedSection]);

  const isBusy =
    props.isStructureLocked ||
    createSectionMutation.isPending ||
    updateSectionMutation.isPending ||
    deleteSectionMutation.isPending ||
    reorderSectionsMutation.isPending;
  const selectedSection = props.selectedSection;

  return (
    <aside className="tg-builder-panel" aria-label="섹션">
      <div className="tg-builder-panel__title-row">
        <h2>섹션</h2>
        <span>{props.sections.length}</span>
      </div>

      <form
        className="tg-builder-create"
        onSubmit={createForm.handleSubmit((values) => {
          createSectionMutation.mutate(
            {
              surveyId: props.surveyId,
              sectionKey: values.sectionKey || createStableKey(values.titleKo, "section"),
              title: { ko: values.titleKo },
              orderIndex: props.sections.length,
              sectionType: values.sectionType,
              settings: {},
            },
            {
              onSuccess: (section) => {
                createForm.reset({ titleKo: "", sectionKey: "", sectionType: "general" });
                setSelectedSectionId(section.id);
              },
            },
          );
        })}
      >
        <label className="tg-builder-field">
          <span>새 섹션</span>
          <input aria-label="새 섹션" placeholder="예: 생활관 시설" {...createForm.register("titleKo")} disabled={isBusy} />
          {createForm.formState.errors.titleKo ? <small>{createForm.formState.errors.titleKo.message}</small> : null}
        </label>
        <details className="tg-builder-advanced">
          <summary>고급 설정</summary>
          <div className="tg-builder-inline">
            <label className="tg-builder-field">
              <span>섹션 키</span>
              <input aria-label="섹션 키" placeholder="자동 생성" {...createForm.register("sectionKey")} disabled={isBusy} />
            </label>
            <label className="tg-builder-field">
              <span>섹션 유형</span>
              <select aria-label="섹션 유형" {...createForm.register("sectionType")} disabled={isBusy}>
                {sectionTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {createForm.formState.errors.sectionKey ? <small>{createForm.formState.errors.sectionKey.message}</small> : null}
        </details>
        <Button type="submit" variant="secondary" icon={<Plus size={16} aria-hidden="true" />} disabled={isBusy}>
          섹션 추가
        </Button>
        {createSectionMutation.isError ? (
          <InlineAlert message="섹션을 추가하지 못했습니다." detail={getErrorDetail(createSectionMutation.error)} />
        ) : null}
        {createSectionMutation.isSuccess ? <InlineNotice message="섹션이 추가되었습니다." /> : null}
      </form>

      <div className="tg-builder-list" role="list" aria-label="섹션 목록">
        {props.sections.length ? (
          props.sections.map((section, index) => (
            <div
              key={section.id}
              className={`tg-builder-list__item ${section.id === props.selectedSection?.id ? "tg-builder-list__item--active" : ""}`}
              role="listitem"
            >
              <button
                type="button"
                className="tg-builder-list__item-main"
                aria-label={`${section.title.ko} 섹션 선택`}
                onClick={() => props.onSelectSection(section.id)}
              >
                <strong>{section.title.ko}</strong>
                <span>질문 {countQuestionsForSection(props.questions, section.id)}개</span>
              </button>
              <div className="tg-builder-list__item-meta">
                <IconButton
                  label="위로 이동"
                  disabled={isBusy || index === 0}
                  onClick={() => moveSection(section.id, -1)}
                  icon={<ArrowUp size={15} aria-hidden="true" />}
                />
                <IconButton
                  label="아래로 이동"
                  disabled={isBusy || index === props.sections.length - 1}
                  onClick={() => moveSection(section.id, 1)}
                  icon={<ArrowDown size={15} aria-hidden="true" />}
                />
                <IconButton
                  label="섹션 복제"
                  disabled={isBusy}
                  onClick={() => duplicateSection(section)}
                  icon={<Copy size={15} aria-hidden="true" />}
                />
                <Button
                  variant="ghost"
                  icon={<Plus size={16} aria-hidden="true" />}
                  aria-label={`${section.title.ko}에 질문 추가`}
                  disabled={props.isStructureLocked}
                  onClick={() => props.onStartQuestion(section.id)}
                >
                  질문 추가
                </Button>
              </div>
            </div>
          ))
        ) : (
          <EmptyState title="섹션이 없습니다." description="첫 섹션을 추가해주세요." />
        )}
      </div>

      {selectedSection ? (
        <form
          className="tg-builder-edit"
          onSubmit={editForm.handleSubmit((values) => {
            updateSectionMutation.mutate({
              surveyId: props.surveyId,
              sectionId: selectedSection.id,
              sectionKey: values.sectionKey || selectedSection.sectionKey,
              title: toLocalizedText(values.titleKo, values.titleEn),
              description: toOptionalLocalizedText(values.descriptionKo, values.descriptionEn),
              sectionType: values.sectionType,
              settings: selectedSection.settings,
            });
          })}
        >
          <h3>섹션 편집</h3>
          <label className="tg-builder-field">
            <span>제목</span>
            <input aria-label="한국어 제목" {...editForm.register("titleKo")} disabled={isBusy} />
            {editForm.formState.errors.titleKo ? <small>{editForm.formState.errors.titleKo.message}</small> : null}
          </label>
          <label className="tg-builder-field">
            <span>설명</span>
            <textarea aria-label="한국어 설명" rows={3} {...editForm.register("descriptionKo")} disabled={isBusy} />
          </label>
          <details className="tg-builder-advanced">
            <summary>고급 설정</summary>
            <label className="tg-builder-field">
              <span>섹션 키</span>
              <input aria-label="섹션 편집 키" {...editForm.register("sectionKey")} disabled={isBusy} />
            </label>
            <label className="tg-builder-field">
              <span>영어 제목</span>
              <input aria-label="영어 제목" {...editForm.register("titleEn")} disabled={isBusy} />
            </label>
            <label className="tg-builder-field">
              <span>영어 설명</span>
              <textarea aria-label="영어 설명" rows={3} {...editForm.register("descriptionEn")} disabled={isBusy} />
            </label>
            <label className="tg-builder-field">
              <span>섹션 유형</span>
              <select aria-label="섹션 편집 유형" {...editForm.register("sectionType")} disabled={isBusy}>
                {sectionTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </label>
          </details>
          {updateSectionMutation.isError ? (
            <InlineAlert message="섹션을 저장하지 못했습니다." detail={getErrorDetail(updateSectionMutation.error)} />
          ) : null}
          {updateSectionMutation.isSuccess ? <InlineNotice message="섹션이 저장되었습니다." /> : null}
          <div className="tg-builder-actions">
            <Button type="submit" variant="primary" icon={<Save size={16} aria-hidden="true" />} disabled={isBusy}>
              저장
            </Button>
            <Button
              type="button"
              variant="danger"
              icon={<Trash2 size={16} aria-hidden="true" />}
              disabled={isBusy}
              onClick={() => {
                if (window.confirm("선택한 섹션을 삭제할까요?")) {
                  deleteSectionMutation.mutate({ surveyId: props.surveyId, sectionId: selectedSection.id });
                }
              }}
            >
              삭제
            </Button>
          </div>
        </form>
      ) : null}
    </aside>
  );

  function moveSection(sectionId: string, direction: -1 | 1) {
    const nextIds = moveId(props.sections.map((section) => section.id), sectionId, direction);
    if (nextIds) reorderSectionsMutation.mutate({ surveyId: props.surveyId, sectionIds: nextIds });
  }

  function duplicateSection(section: SurveySection) {
    createSectionMutation.mutate({
      surveyId: props.surveyId,
      sectionKey: `${section.sectionKey}_copy_${Date.now().toString(36)}`,
      title: { ko: `${section.title.ko} 복사본`, en: section.title.en },
      description: section.description,
      orderIndex: props.sections.length,
      sectionType: section.sectionType,
      settings: section.settings,
    });
  }
}

function QuestionPanel(props: {
  surveyId: string;
  selectedSection?: SurveySection;
  questions: Question[];
  selectedQuestion?: Question;
  isStructureLocked: boolean;
  onSelectQuestion: (questionId: string) => void;
  onStartQuestion: (sectionId: string, afterQuestionId?: string) => void;
}) {
  const createQuestionMutation = useCreateQuestionMutation();
  const reorderQuestionsMutation = useReorderQuestionsMutation();
  const isBusy = props.isStructureLocked || createQuestionMutation.isPending || reorderQuestionsMutation.isPending;

  if (!props.selectedSection) {
    return (
      <aside className="tg-builder-panel" aria-label="질문">
        <EmptyState title="선택된 섹션이 없습니다." description="섹션을 먼저 추가해주세요." />
      </aside>
    );
  }

  const selectedSection = props.selectedSection;
  const groupedQuestions = groupQuestionsForDisplay(props.questions);

  return (
    <aside className="tg-builder-panel" aria-label="질문">
      <div className="tg-builder-panel__title-row">
        <h2>질문</h2>
        <span>{props.questions.length}</span>
      </div>
      <p className="tg-builder-selected-section">현재 섹션: {selectedSection.title.ko}</p>

      <div className="tg-builder-list" role="list" aria-label="질문 목록">
        {props.questions.length ? (
          groupedQuestions.map((group) => (
            <div key={group.key} className={`tg-builder-question-group ${group.label ? "tg-builder-question-group--cluster" : ""}`}>
              {group.label ? (
                <div className="tg-builder-question-group__header">
                  <p className="tg-builder-question-group__title">{group.label}</p>
                  <span>{group.questions.length}개 항목</span>
                </div>
              ) : null}
              {group.questions.map((question) => {
                const displayTitle = getQuestionDisplayTitle(question);
                return (
                  <div
                    key={question.id}
                    className={`tg-builder-list__item ${question.id === props.selectedQuestion?.id ? "tg-builder-list__item--active" : ""}`}
                    role="listitem"
                  >
                    <button
                      type="button"
                      className="tg-builder-list__item-main"
                      aria-label={`${displayTitle} 질문 선택`}
                      onClick={() => props.onSelectQuestion(question.id)}
                    >
                      <strong>{displayTitle}</strong>
                      <span>{getQuestionTypeLabel(question.questionType, question.config)} · {getMetricTypeLabel(question.metricType)}</span>
                    </button>
                    <div className="tg-builder-list__item-meta">
                      <div className="tg-builder-list__item-tools">
                        <IconButton
                          label={`${displayTitle} 위로 이동`}
                          disabled={isBusy || props.questions.indexOf(question) === 0}
                          onClick={() => moveQuestion(question.id, -1)}
                          icon={<ArrowUp size={15} aria-hidden="true" />}
                        />
                        <IconButton
                          label={`${displayTitle} 아래로 이동`}
                          disabled={isBusy || props.questions.indexOf(question) === props.questions.length - 1}
                          onClick={() => moveQuestion(question.id, 1)}
                          icon={<ArrowDown size={15} aria-hidden="true" />}
                        />
                        <IconButton
                          label={`${displayTitle} 질문 복제`}
                          disabled={isBusy}
                          onClick={() => duplicateQuestion(question)}
                          icon={<Copy size={15} aria-hidden="true" />}
                        />
                      </div>
                      <Button
                        variant="ghost"
                        className="tg-builder-list__add-below"
                        icon={<FilePlus2 size={16} aria-hidden="true" />}
                        aria-label={`${displayTitle} 아래에 새 질문 추가`}
                        disabled={isBusy}
                        onClick={() => props.onStartQuestion(selectedSection.id, question.id)}
                      >
                        아래에 새 질문 추가
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        ) : (
          <EmptyState
            title="질문이 없습니다."
            description="선택한 섹션에 첫 질문을 추가해주세요."
            actionLabel="첫 질문 추가"
            onAction={props.isStructureLocked ? undefined : () => props.onStartQuestion(selectedSection.id)}
          />
        )}
      </div>
    </aside>
  );

  function moveQuestion(questionId: string, direction: -1 | 1) {
    const nextIds = moveId(props.questions.map((question) => question.id), questionId, direction);
    if (nextIds && props.selectedSection) {
      reorderQuestionsMutation.mutate({ surveyId: props.surveyId, sectionId: props.selectedSection.id, questionIds: nextIds });
    }
  }

  function duplicateQuestion(question: Question) {
    const displayTitle = getQuestionDisplayTitle(question);
    createQuestionMutation.mutate({
      surveyId: props.surveyId,
      sectionId: selectedSection.id,
      questionKey: `${question.questionKey}_copy_${Date.now().toString(36)}`,
      questionType: question.questionType,
      title: { ko: `${displayTitle} 복사본`, en: question.title.en },
      description: question.description,
      orderIndex: props.questions.length,
      isRequired: question.isRequired,
      metricType: question.metricType,
      topicKey: question.topicKey,
      spaceKey: question.spaceKey,
      config: question.config,
      validation: question.validation,
    });
  }
}

type QuestionCreatePlacement = Readonly<{
  sectionId: string;
  afterQuestionId?: string;
}>;

function QuestionEditor(props: {
  surveyId: string;
  selectedSection?: SurveySection;
  questions: Question[];
  question?: Question;
  createPlacement?: QuestionCreatePlacement;
  assets: SurveyAsset[];
  isStructureLocked: boolean;
  onCancelCreate: () => void;
  onQuestionCreated: (questionId: string) => void;
}) {
  const updateQuestionMutation = useUpdateQuestionMutation();
  const deleteQuestionMutation = useDeleteQuestionMutation();
  const editForm = useForm<EditQuestionForm>({
    resolver: zodResolver(editQuestionSchema),
    defaultValues: questionToEditForm(props.question),
  });
  const isBusy = props.isStructureLocked || updateQuestionMutation.isPending || deleteQuestionMutation.isPending;
  const watchedQuestionType = editForm.watch("questionType");
  const watchedConfigJson = editForm.watch("configJson");

  useEffect(() => {
    editForm.reset(questionToEditForm(props.question));
  }, [editForm, props.question]);

  if (props.createPlacement) {
    return (
      <QuestionCreateEditor
        surveyId={props.surveyId}
        selectedSection={props.selectedSection}
        questions={props.questions}
        createPlacement={props.createPlacement}
        isStructureLocked={props.isStructureLocked}
        onCancel={props.onCancelCreate}
        onQuestionCreated={props.onQuestionCreated}
      />
    );
  }

  if (!props.question) {
    return (
      <aside className="tg-builder-panel tg-builder-panel--editor" aria-label="질문 작업">
        <EmptyState title="선택된 질문이 없습니다." description="질문 노드를 선택하거나 새 질문 추가를 눌러주세요." />
      </aside>
    );
  }

  const question = props.question;

  return (
    <aside className="tg-builder-panel tg-builder-panel--editor" aria-label="질문 편집">
      <div className="tg-builder-panel__title-row">
        <h2>질문 편집</h2>
        <StatusBadge tone="info">{getQuestionTypeLabel(question.questionType, question.config)}</StatusBadge>
      </div>

      <form
        className="tg-builder-edit"
        onSubmit={editForm.handleSubmit((values) => {
          const config = normalizeQuestionConfigForKind(values.questionType, parseJsonRecord(values.configJson) ?? {});
          updateQuestionMutation.mutate({
            surveyId: props.surveyId,
            questionId: question.id,
            questionKey: values.questionKey || question.questionKey,
            questionType: toPersistedQuestionType(values.questionType),
            title: toLocalizedText(values.titleKo, values.titleEn),
            description: toOptionalLocalizedText(values.descriptionKo, values.descriptionEn),
            isRequired: values.isRequired,
            metricType: values.metricType,
            topicKey: values.topicKey || undefined,
            spaceKey: values.spaceKey || undefined,
            config: config as QuestionConfig,
            validation: question.validation,
          });
        })}
      >
        <label className="tg-builder-field">
          <span>질문</span>
          <input aria-label="한국어 제목" {...editForm.register("titleKo")} disabled={isBusy} />
          {editForm.formState.errors.titleKo ? <small>{editForm.formState.errors.titleKo.message}</small> : null}
        </label>
        <label className="tg-builder-field">
          <span>설명</span>
          <textarea aria-label="한국어 설명" rows={3} {...editForm.register("descriptionKo")} disabled={isBusy} />
        </label>

        <div className="tg-builder-two-col">
          <label className="tg-builder-field">
            <span>질문 유형</span>
            <select
              aria-label="질문 유형"
              {...editForm.register("questionType", {
                onChange: (event) => {
                  const questionKind = event.target.value as QuestionKind;
                  editForm.setValue("metricType", defaultMetricType(questionKind), { shouldDirty: true, shouldValidate: true });
                  editForm.setValue("configJson", stringifyConfig(defaultQuestionConfig(questionKind)), {
                    shouldDirty: true,
                    shouldValidate: true,
                  });
                },
              })}
              disabled={isBusy}
            >
              {getQuestionKindOptions(question).map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </label>
          <label className="tg-builder-check">
            <input type="checkbox" {...editForm.register("isRequired")} disabled={isBusy} />
            <span>필수 질문</span>
          </label>
        </div>

        <QuestionConfigFields
          surveyId={props.surveyId}
          question={question}
          assets={props.assets}
          questionType={watchedQuestionType}
          configJson={watchedConfigJson}
          disabled={isBusy}
          onConfigChange={(nextConfig) => editForm.setValue("configJson", nextConfig, { shouldDirty: true, shouldValidate: true })}
        />

        <details className="tg-builder-advanced">
          <summary>고급 설정</summary>
          <label className="tg-builder-field">
            <span>질문 키</span>
            <input aria-label="질문 편집 키" {...editForm.register("questionKey")} disabled={isBusy} />
          </label>
          <label className="tg-builder-field">
            <span>영어 제목</span>
            <input aria-label="영어 제목" {...editForm.register("titleEn")} disabled={isBusy} />
          </label>
          <label className="tg-builder-field">
            <span>영어 설명</span>
            <textarea aria-label="영어 설명" rows={3} {...editForm.register("descriptionEn")} disabled={isBusy} />
          </label>
          <div className="tg-builder-two-col">
            <label className="tg-builder-field">
              <span>분석 지표</span>
              <select aria-label="분석 지표" {...editForm.register("metricType")} disabled={isBusy}>
                {metricTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="tg-builder-field">
              <span>topic key</span>
              <input aria-label="topic key" {...editForm.register("topicKey")} disabled={isBusy} />
            </label>
            <label className="tg-builder-field">
              <span>space key</span>
              <input aria-label="space key" {...editForm.register("spaceKey")} disabled={isBusy} />
            </label>
          </div>
          <label className="tg-builder-field">
            <span>config JSON</span>
            <textarea className="tg-builder-code" rows={10} spellCheck={false} {...editForm.register("configJson")} disabled={isBusy} />
            {editForm.formState.errors.configJson ? <small>{editForm.formState.errors.configJson.message}</small> : null}
          </label>
        </details>

        {updateQuestionMutation.isError ? (
          <InlineAlert message="질문을 저장하지 못했습니다." detail={getErrorDetail(updateQuestionMutation.error)} />
        ) : null}
        {updateQuestionMutation.isSuccess ? <InlineNotice message="질문이 저장되었습니다." /> : null}

        <div className="tg-builder-actions">
          <Button type="submit" variant="primary" icon={<Save size={16} aria-hidden="true" />} disabled={isBusy}>
            저장
          </Button>
          <Button
            type="button"
            variant="danger"
            icon={deleteQuestionMutation.isPending ? <Loader2 size={16} aria-hidden="true" /> : <Trash2 size={16} aria-hidden="true" />}
            disabled={isBusy}
            onClick={() => {
              if (window.confirm("선택한 질문을 삭제할까요?")) {
                deleteQuestionMutation.mutate({ surveyId: props.surveyId, questionId: question.id });
              }
            }}
          >
            삭제
          </Button>
        </div>
      </form>
    </aside>
  );
}

function QuestionCreateEditor(props: {
  surveyId: string;
  selectedSection?: SurveySection;
  questions: Question[];
  createPlacement: QuestionCreatePlacement;
  isStructureLocked: boolean;
  onCancel: () => void;
  onQuestionCreated: (questionId: string) => void;
}) {
  const createQuestionMutation = useCreateQuestionMutation();
  const reorderQuestionsMutation = useReorderQuestionsMutation();
  const createForm = useForm<CreateQuestionForm>({
    resolver: zodResolver(createQuestionSchema),
    defaultValues: defaultCreateQuestionForm(),
  });
  const watchedCreateMode = createForm.watch("createMode");
  const watchedType = createForm.watch("questionType");
  const selectedSection = props.selectedSection;
  const afterQuestion = props.questions.find((question) => question.id === props.createPlacement.afterQuestionId);
  const inheritedDisplayGroup = getDisplayGroupFromConfig(afterQuestion?.config);
  const afterQuestionTitle = afterQuestion ? getQuestionDisplayTitle(afterQuestion) : undefined;
  const isBusy = props.isStructureLocked || createQuestionMutation.isPending || reorderQuestionsMutation.isPending;

  useEffect(() => {
    createForm.reset(defaultCreateQuestionForm(inheritedDisplayGroup));
  }, [createForm, inheritedDisplayGroup, props.createPlacement.afterQuestionId, props.createPlacement.sectionId]);

  if (!selectedSection) {
    return (
      <aside className="tg-builder-panel tg-builder-panel--editor" aria-label="질문 추가">
        <EmptyState title="선택된 섹션이 없습니다." description="질문을 추가할 섹션을 먼저 선택해주세요." />
      </aside>
    );
  }

  return (
    <aside className="tg-builder-panel tg-builder-panel--editor" aria-label="질문 추가">
      <div className="tg-builder-panel__title-row">
        <h2>질문 추가</h2>
        <Button variant="ghost" icon={<X size={16} aria-hidden="true" />} onClick={props.onCancel} disabled={isBusy}>
          닫기
        </Button>
      </div>
      <p className="tg-builder-hint">
        {afterQuestionTitle ? `${afterQuestionTitle} 아래에 추가됩니다.` : `${selectedSection.title.ko} 끝에 추가됩니다.`}
      </p>

      <form
        className="tg-builder-edit tg-builder-edit--flat"
        onSubmit={createForm.handleSubmit(async (values) => {
          const targetIndex = getQuestionInsertionIndex(props.questions, props.createPlacement.afterQuestionId);
          const metricType = defaultMetricType(values.questionType);

          try {
            if (values.createMode === "group") {
              const groupTitle = values.groupTitleKo?.trim() ?? "";
              const itemTitles = splitLines(values.groupItems ?? "");
              const keyPrefix = values.questionKeyPrefix || createStableKey(groupTitle, "question_group");
              const createdQuestions: Question[] = [];

              for (const [index, itemTitle] of itemTitles.entries()) {
                const question = await createQuestionMutation.mutateAsync({
                  surveyId: props.surveyId,
                  sectionId: selectedSection.id,
                  questionKey: createGroupedQuestionKey(keyPrefix, index),
                  questionType: toPersistedQuestionType(values.questionType),
                  title: { ko: itemTitle },
                  orderIndex: props.questions.length + index,
                  isRequired: true,
                  metricType,
                  config: withDisplayGroup(defaultQuestionConfig(values.questionType), groupTitle),
                  validation: {},
                });
                createdQuestions.push(question);
              }

              const nextQuestionIds = insertIdsAt(
                props.questions.map((item) => item.id),
                createdQuestions.map((question) => question.id),
                targetIndex,
              );
              if (nextQuestionIds.length > createdQuestions.length) {
                await reorderQuestionsMutation.mutateAsync({
                  surveyId: props.surveyId,
                  sectionId: selectedSection.id,
                  questionIds: nextQuestionIds,
                });
              }
              createForm.reset(defaultCreateQuestionForm());
              props.onQuestionCreated(createdQuestions[0].id);
              return;
            }

            const titleKo = values.titleKo?.trim() ?? "";
            const question = await createQuestionMutation.mutateAsync({
              surveyId: props.surveyId,
              sectionId: selectedSection.id,
              questionKey: values.questionKey || createStableKey(titleKo, "question"),
              questionType: toPersistedQuestionType(values.questionType),
              title: { ko: titleKo },
              orderIndex: props.questions.length,
              isRequired: true,
              metricType,
              config: withDisplayGroup(defaultQuestionConfig(values.questionType), values.displayGroup),
              validation: {},
            });

            const nextQuestionIds = insertIdAt(
              props.questions.map((item) => item.id),
              question.id,
              targetIndex,
            );
            if (nextQuestionIds.length > 1) {
              await reorderQuestionsMutation.mutateAsync({
                surveyId: props.surveyId,
                sectionId: selectedSection.id,
                questionIds: nextQuestionIds,
              });
            }
            createForm.reset(defaultCreateQuestionForm());
            props.onQuestionCreated(question.id);
          } catch {
            // Mutation state renders the inline error message.
          }
        })}
      >
        <div className="tg-builder-segmented" role="group" aria-label="질문 추가 방식">
          <button
            type="button"
            aria-pressed={watchedCreateMode === "single"}
            className={watchedCreateMode === "single" ? "tg-builder-segmented__button--active" : undefined}
            onClick={() => createForm.setValue("createMode", "single", { shouldDirty: true, shouldValidate: true })}
            disabled={isBusy}
          >
            단일 질문
          </button>
          <button
            type="button"
            aria-pressed={watchedCreateMode === "group"}
            className={watchedCreateMode === "group" ? "tg-builder-segmented__button--active" : undefined}
            onClick={() => createForm.setValue("createMode", "group", { shouldDirty: true, shouldValidate: true })}
            disabled={isBusy}
          >
            세부 항목 묶음
          </button>
        </div>

        {watchedCreateMode === "group" ? (
          <div className="tg-builder-group-create">
            <label className="tg-builder-field">
              <span>큰 질문</span>
              <input
                aria-label="큰 질문"
                placeholder="예: 침묵시간과 관련된 다음 항목에 대한 만족도"
                {...createForm.register("groupTitleKo")}
                disabled={isBusy}
              />
              {createForm.formState.errors.groupTitleKo ? <small>{createForm.formState.errors.groupTitleKo.message}</small> : null}
            </label>
            <label className="tg-builder-field">
              <span>세부 항목</span>
              <textarea
                aria-label="세부 항목"
                rows={6}
                placeholder={"침묵시간 운영시간\n침묵시간 규칙 준수"}
                {...createForm.register("groupItems")}
                disabled={isBusy}
              />
              {createForm.formState.errors.groupItems ? <small>{createForm.formState.errors.groupItems.message}</small> : null}
            </label>
          </div>
        ) : (
          <>
            <label className="tg-builder-field">
              <span>새 질문</span>
              <input aria-label="새 질문" placeholder="예: 침대 상태에 만족하시나요?" {...createForm.register("titleKo")} disabled={isBusy} />
              {createForm.formState.errors.titleKo ? <small>{createForm.formState.errors.titleKo.message}</small> : null}
            </label>
            <label className="tg-builder-field">
              <span>큰 질문</span>
              <input
                aria-label="큰 질문"
                placeholder="세부 항목 묶음에 포함할 때 입력"
                {...createForm.register("displayGroup")}
                disabled={isBusy}
              />
              {createForm.formState.errors.displayGroup ? <small>{createForm.formState.errors.displayGroup.message}</small> : null}
            </label>
          </>
        )}

        <label className="tg-builder-field">
          <span>{watchedCreateMode === "group" ? "세부 항목 유형" : "질문 유형"}</span>
          <select aria-label="질문 유형" {...createForm.register("questionType")} disabled={isBusy}>
            {visibleQuestionTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </label>
        <details className="tg-builder-advanced">
          <summary>고급 설정</summary>
          {watchedCreateMode === "group" ? (
            <label className="tg-builder-field">
              <span>질문 키 접두어</span>
              <input aria-label="질문 키 접두어" placeholder="예: silence_time" {...createForm.register("questionKeyPrefix")} disabled={isBusy} />
              {createForm.formState.errors.questionKeyPrefix ? <small>{createForm.formState.errors.questionKeyPrefix.message}</small> : null}
            </label>
          ) : (
            <label className="tg-builder-field">
              <span>질문 키</span>
              <input aria-label="질문 키" placeholder="자동 생성" {...createForm.register("questionKey")} disabled={isBusy} />
              {createForm.formState.errors.questionKey ? <small>{createForm.formState.errors.questionKey.message}</small> : null}
            </label>
          )}
        </details>
        <p className="tg-builder-hint">
          기본 설정: {getQuestionTypeLabel(toPersistedQuestionType(watchedType), defaultQuestionConfig(watchedType))}
          {watchedCreateMode === "group" ? " · 세부 항목별 질문으로 저장" : ""}
        </p>
        {createQuestionMutation.isError ? (
          <InlineAlert message="질문을 추가하지 못했습니다." detail={getErrorDetail(createQuestionMutation.error)} />
        ) : null}
        {reorderQuestionsMutation.isError ? (
          <InlineAlert message="질문 위치를 저장하지 못했습니다." detail={getErrorDetail(reorderQuestionsMutation.error)} />
        ) : null}
        <div className="tg-builder-actions">
          <Button type="button" variant="secondary" onClick={props.onCancel} disabled={isBusy}>
            취소
          </Button>
          <Button
            type="submit"
            variant="primary"
            icon={createQuestionMutation.isPending ? <Loader2 size={16} aria-hidden="true" /> : <FilePlus2 size={16} aria-hidden="true" />}
            disabled={isBusy}
          >
            질문 추가
          </Button>
        </div>
      </form>
    </aside>
  );
}

function QuestionConfigFields(props: {
  surveyId: string;
  question: Question;
  assets: SurveyAsset[];
  questionType: QuestionKind;
  configJson: string;
  disabled: boolean;
  onConfigChange: (configJson: string) => void;
}) {
  const uploadMutation = useUploadSurveyImageMutation();
  const config = parseJsonRecord(props.configJson) ?? {};
  const setConfig = (patch: JsonRecord) => props.onConfigChange(stringifyConfig({ ...config, ...patch } as QuestionConfig));
  const displayGroupField = (
    <label className="tg-builder-field">
      <span>큰 질문</span>
      <input
        aria-label="큰 질문"
        placeholder="세부 항목 묶음에 포함할 때 입력"
        value={getDisplayGroupFromConfig(config)}
        disabled={props.disabled}
        onChange={(event) => props.onConfigChange(stringifyConfig(withDisplayGroup(config as QuestionConfig, event.target.value)))}
      />
    </label>
  );

  if (props.questionType === "profile") {
    const choiceOptions = getChoiceOptions(config);
    const profileField = typeof config.profileField === "string" ? config.profileField : "";
    const inputType = typeof config.inputType === "string" ? config.inputType : choiceOptions.length ? "single_choice" : "text";
    return (
      <div className="tg-builder-config-panel">
        <div className="tg-builder-config-note">
          <FileText size={16} aria-hidden="true" />
          <span>기본 정보 응답은 분석 필터에 쓰일 수 있으므로 항목 값과 선택지를 확인한 뒤 저장해주세요.</span>
        </div>
        <div className="tg-builder-two-col">
          <label className="tg-builder-field">
            <span>기본 정보 항목</span>
            <input
              aria-label="기본 정보 항목"
              list="tg-builder-profile-fields"
              placeholder="예: gender"
              value={profileField}
              disabled={props.disabled}
              onChange={(event) => setConfig({ profileField: event.target.value })}
            />
            <datalist id="tg-builder-profile-fields">
              {profileFieldOptions.map((field) => (
                <option key={field.value} value={field.value}>
                  {field.label}
                </option>
              ))}
            </datalist>
          </label>
          <label className="tg-builder-field">
            <span>응답 방식</span>
            <select
              aria-label="기본 정보 응답 방식"
              value={inputType}
              disabled={props.disabled}
              onChange={(event) => {
                const nextInputType = event.target.value;
                setConfig({
                  inputType: nextInputType,
                  options: nextInputType === "single_choice" ? choiceOptions.length ? choiceOptions : [{ value: "option_1", labelKo: "선택지 1" }] : [],
                });
              }}
            >
              <option value="text">텍스트 입력</option>
              <option value="single_choice">단일 선택</option>
            </select>
          </label>
        </div>
        {inputType === "single_choice" ? (
          <div className="tg-builder-profile-options">
            <ChoiceOptionsEditor
              label="세부 답변 항목"
              rows={6}
              config={config}
              disabled={props.disabled}
              koPlaceholder={"남성\n여성"}
              enPlaceholder={"Male\nFemale"}
              onOptionsChange={(options) => setConfig({ options })}
            />
            <div className="tg-builder-config-summary" aria-label="세부 답변 항목 미리보기">
              {choiceOptions.length ? (
                choiceOptions.map((option) => (
                  <span key={option.value}>{option.labelEn ? `${option.labelKo} / ${option.labelEn}` : option.labelKo}</span>
                ))
              ) : (
                <span>선택지가 없습니다.</span>
              )}
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  if (props.questionType === "scale") {
    const labelsKo = Array.isArray(config.labelsKo) ? config.labelsKo.filter((label): label is string => typeof label === "string") : [];
    const labelsEn = Array.isArray(config.labelsEn) ? config.labelsEn.filter((label): label is string => typeof label === "string") : [];
    return (
      <div className="tg-builder-config-panel">
        {displayGroupField}
        <div className="tg-builder-two-col">
          <label className="tg-builder-field">
            <span>최소 점수</span>
            <input
              type="number"
              value={Number(config.scaleMin ?? 1)}
              disabled={props.disabled}
              onChange={(event) => setConfig({ scaleMin: Number(event.target.value) })}
            />
          </label>
          <label className="tg-builder-field">
            <span>최대 점수</span>
            <input
              type="number"
              value={Number(config.scaleMax ?? 5)}
              disabled={props.disabled}
              onChange={(event) => setConfig({ scaleMax: Number(event.target.value) })}
            />
          </label>
        </div>
        <div className="tg-builder-choice-options">
          <span className="tg-builder-choice-options__title">척도 라벨</span>
          <div className="tg-builder-choice-options__grid">
            <label className="tg-builder-field">
              <span>한국어</span>
              <textarea
                aria-label="척도 라벨 한국어"
                rows={5}
                value={labelsKo.join("\n")}
                disabled={props.disabled}
                onChange={(event) => setConfig({ labelsKo: splitLines(event.target.value) })}
              />
            </label>
            <label className="tg-builder-field">
              <span>영어</span>
              <textarea
                aria-label="척도 라벨 영어"
                rows={5}
                value={labelsEn.join("\n")}
                disabled={props.disabled}
                placeholder={"Very dissatisfied\nDissatisfied\nNeutral\nSatisfied\nVery satisfied"}
                onChange={(event) => setConfig({ labelsEn: splitLines(event.target.value) })}
              />
            </label>
          </div>
        </div>
      </div>
    );
  }

  if (props.questionType === "single_choice" || props.questionType === "multi_select" || props.questionType === "ranking") {
    return (
      <div className="tg-builder-config-panel">
        {displayGroupField}
        <ChoiceOptionsEditor
          label="세부 답변 항목"
          rows={6}
          config={config}
          disabled={props.disabled}
          onOptionsChange={(options) => setConfig({ options })}
        />
      </div>
    );
  }

  if (props.questionType === shortTextQuestionKind) {
    return (
      <div className="tg-builder-config-panel">
        {displayGroupField}
        <div className="tg-builder-config-note">
          <FileText size={16} aria-hidden="true" />
          <span>참여자는 한 줄 단답형 답변만 작성합니다.</span>
        </div>
        <label className="tg-builder-field">
          <span>최대 글자 수</span>
          <input
            type="number"
            min={1}
            value={Number(config.maxLength ?? 200)}
            disabled={props.disabled}
            onChange={(event) => setConfig({ textMode: "short", multiline: false, maxLength: Number(event.target.value) })}
          />
        </label>
      </div>
    );
  }

  if (props.questionType === "text") {
    return (
      <div className="tg-builder-config-panel">
        {displayGroupField}
        <div className="tg-builder-config-note">
          <FileText size={16} aria-hidden="true" />
          <span>참여자는 별도 분류 선택 없이 주관식 답변만 작성합니다.</span>
        </div>
        <label className="tg-builder-field">
          <span>최대 글자 수</span>
          <input
            type="number"
            min={1}
            value={Number(config.maxLength ?? 1000)}
            disabled={props.disabled}
            onChange={(event) => setConfig({ textMode: "plain", multiline: true, maxLength: Number(event.target.value) })}
          />
        </label>
      </div>
    );
  }

  if (props.questionType === choiceTextQuestionKind) {
    const choiceOptions = getChoiceOptions(config);
    return (
      <div className="tg-builder-config-panel">
        {displayGroupField}
        <div className="tg-builder-config-note">
          <FileText size={16} aria-hidden="true" />
          <span>참여자는 분류를 먼저 선택한 뒤 주관식 답변을 작성합니다.</span>
        </div>
        <ChoiceOptionsEditor
          label="세부 답변 항목"
          rows={5}
          config={config}
          disabled={props.disabled}
          koPlaceholder={"불편\n개선\n칭찬\n문의\n기타"}
          enPlaceholder={"Complaint\nImprovement\nPraise\nInquiry\nOther"}
          onOptionsChange={(options) =>
            setConfig({
              textMode: "choice_then_text",
              multiline: true,
              maxLength: Number(config.maxLength ?? 1000),
              options,
            })
          }
        />
        <label className="tg-builder-field">
          <span>최대 글자 수</span>
          <input
            type="number"
            min={1}
            value={Number(config.maxLength ?? 1000)}
            disabled={props.disabled}
            onChange={(event) => setConfig({ textMode: "choice_then_text", multiline: true, maxLength: Number(event.target.value) })}
          />
        </label>
      </div>
    );
  }

  if (props.questionType === "attention_check") {
    const scaleMin = typeof config.scaleMin === "number" ? config.scaleMin : 1;
    const scaleMax = typeof config.scaleMax === "number" ? config.scaleMax : 5;
    const expectedValue = typeof config.expectedValue === "number" || typeof config.expectedValue === "string" ? String(config.expectedValue) : "3";
    const labelsKo = Array.isArray(config.labelsKo) ? config.labelsKo.filter((label): label is string => typeof label === "string") : [];
    const labelsEn = Array.isArray(config.labelsEn) ? config.labelsEn.filter((label): label is string => typeof label === "string") : [];
    return (
      <div className="tg-builder-config-panel">
        {displayGroupField}
        <div className="tg-builder-config-note">
          <FileText size={16} aria-hidden="true" />
          <span>참여자는 척도로 답합니다. 지정한 값을 선택하지 않은 응답은 분석에서 자동 제외됩니다.</span>
        </div>
        <div className="tg-builder-two-col">
          <label className="tg-builder-field">
            <span>최소 점수</span>
            <input
              type="number"
              min={1}
              value={scaleMin}
              disabled={props.disabled}
              onChange={(event) => setConfig({ scaleMin: Number(event.target.value), excludeIfFailed: true })}
            />
          </label>
          <label className="tg-builder-field">
            <span>최대 점수</span>
            <input
              type="number"
              min={scaleMin}
              value={scaleMax}
              disabled={props.disabled}
              onChange={(event) => setConfig({ scaleMax: Number(event.target.value), excludeIfFailed: true })}
            />
          </label>
        </div>
        <label className="tg-builder-field">
          <span>정답 점수</span>
          <input
            type="number"
            min={scaleMin}
            max={scaleMax}
            value={expectedValue}
            disabled={props.disabled}
            onChange={(event) => setConfig({ expectedValue: event.target.value, excludeIfFailed: true })}
          />
        </label>
        <div className="tg-builder-choice-options">
          <span className="tg-builder-choice-options__title">점수 라벨</span>
          <div className="tg-builder-choice-options__grid">
            <label className="tg-builder-field">
              <span>한국어</span>
              <textarea
                aria-label="점수 라벨 한국어"
                rows={3}
                value={labelsKo.join("\n")}
                disabled={props.disabled}
                placeholder={"1점\n2점\n3점\n4점\n5점"}
                onChange={(event) =>
                  setConfig({
                    labelsKo: splitLines(event.target.value),
                    excludeIfFailed: true,
                  })
                }
              />
            </label>
            <label className="tg-builder-field">
              <span>영어</span>
              <textarea
                aria-label="점수 라벨 영어"
                rows={3}
                value={labelsEn.join("\n")}
                disabled={props.disabled}
                placeholder={"1 point\n2 points\n3 points\n4 points\n5 points"}
                onChange={(event) =>
                  setConfig({
                    labelsEn: splitLines(event.target.value),
                    excludeIfFailed: true,
                  })
                }
              />
            </label>
          </div>
        </div>
      </div>
    );
  }

  if (props.questionType === "image_tag") {
    const tagTypes = Array.isArray(config.tagTypes) ? config.tagTypes.filter((tag): tag is string => typeof tag === "string") : [];
    const tagTypesEn = Array.isArray(config.tagTypesEn) ? config.tagTypesEn.filter((tag): tag is string => typeof tag === "string") : [];
    const assetId = typeof config.assetId === "string" ? config.assetId : undefined;
    const asset = props.assets.find((item) => item.id === assetId);
    return (
      <div className="tg-builder-config-panel">
        {displayGroupField}
        <div className="tg-builder-upload-card">
          <div>
            <ImageIcon size={16} aria-hidden="true" />
            <span>{asset ? asset.storagePath : "이미지 태깅에 사용할 사진을 업로드해주세요."}</span>
          </div>
          <label className="tg-builder-upload-button">
            <Upload size={15} aria-hidden="true" />
            <span>이미지 업로드</span>
            <input
              aria-label="이미지 업로드"
              type="file"
              accept="image/*"
              disabled={props.disabled || uploadMutation.isPending}
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (!file) return;
                uploadMutation.mutate(
                  {
                    surveyId: props.surveyId,
                    sectionId: props.question.sectionId,
                    questionId: props.question.id,
                    file,
                    metadata: { usage: "question_image_tag" },
                  },
                  {
                    onSuccess: (asset) => {
                      setConfig({ assetId: asset.id });
                    },
                  },
                );
              }}
            />
          </label>
          <small>업로드 후 저장을 누르면 질문에 이미지가 연결됩니다.</small>
          {uploadMutation.isError ? <small>{getErrorDetail(uploadMutation.error) ?? "이미지를 업로드하지 못했습니다."}</small> : null}
        </div>
        <label className="tg-builder-field">
          <span>최대 태그 수</span>
          <input
            type="number"
            value={Number(config.maxTags ?? 3)}
            disabled={props.disabled}
            onChange={(event) => setConfig({ maxTags: Number(event.target.value) })}
          />
        </label>
        <div className="tg-builder-choice-options">
          <span className="tg-builder-choice-options__title">태그 유형</span>
          <div className="tg-builder-choice-options__grid">
            <label className="tg-builder-field">
              <span>한국어</span>
              <textarea
                aria-label="태그 유형 한국어"
                rows={4}
                value={tagTypes.join("\n")}
                disabled={props.disabled}
                onChange={(event) => setConfig({ tagTypes: splitLines(event.target.value) })}
              />
            </label>
            <label className="tg-builder-field">
              <span>영어</span>
              <textarea
                aria-label="태그 유형 영어"
                rows={4}
                value={tagTypesEn.join("\n")}
                disabled={props.disabled}
                placeholder={"Inconvenience\nRepair Request\nImprovement Suggestion"}
                onChange={(event) => setConfig({ tagTypesEn: splitLines(event.target.value) })}
              />
            </label>
          </div>
        </div>
      </div>
    );
  }

  if (props.questionType === "participant_image_tag") {
    const tagTypes = Array.isArray(config.tagTypes) ? config.tagTypes.filter((tag): tag is string => typeof tag === "string") : [];
    const tagTypesEn = Array.isArray(config.tagTypesEn) ? config.tagTypesEn.filter((tag): tag is string => typeof tag === "string") : [];
    return (
      <div className="tg-builder-config-panel">
        {displayGroupField}
        <div className="tg-builder-config-note">
          <ImageIcon size={16} aria-hidden="true" />
          <span>관리자는 태깅 카테고리만 정하고, 참여자가 직접 사진을 올려 지점을 표시합니다.</span>
        </div>
        <div className="tg-builder-choice-options">
          <span className="tg-builder-choice-options__title">태깅 카테고리</span>
          <div className="tg-builder-choice-options__grid">
            <label className="tg-builder-field">
              <span>한국어</span>
              <textarea
                aria-label="태깅 카테고리 한국어"
                rows={5}
                value={tagTypes.join("\n")}
                disabled={props.disabled}
                onChange={(event) => setConfig({ tagTypes: splitLines(event.target.value) })}
              />
            </label>
            <label className="tg-builder-field">
              <span>영어</span>
              <textarea
                aria-label="태깅 카테고리 영어"
                rows={5}
                value={tagTypesEn.join("\n")}
                disabled={props.disabled}
                placeholder={"Inconvenience\nRepair Request\nImprovement Suggestion\nOther"}
                onChange={(event) => setConfig({ tagTypesEn: splitLines(event.target.value) })}
              />
            </label>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="tg-builder-config-panel tg-builder-config-panel--quiet">
      {displayGroupField}
      <span>{getQuestionTypeLabel(toPersistedQuestionType(props.questionType), config as QuestionConfig)} 문항은 기본 설정으로 저장됩니다.</span>
    </div>
  );
}

function ChoiceOptionsEditor(props: {
  label: string;
  config: JsonRecord;
  disabled: boolean;
  rows?: number;
  koPlaceholder?: string;
  enPlaceholder?: string;
  onOptionsChange: (options: Array<{ value: string; labelKo: string; labelEn?: string }>) => void;
}) {
  const existingOptions = getChoiceOptions(props.config);
  const koText = optionsToText(props.config, "ko");
  const enText = optionsToText(props.config, "en");

  return (
    <div className="tg-builder-choice-options">
      <span className="tg-builder-choice-options__title">{props.label}</span>
      <div className="tg-builder-choice-options__grid">
        <label className="tg-builder-field">
          <span>한국어</span>
          <textarea
            aria-label={`${props.label} 한국어`}
            rows={props.rows ?? 6}
            value={koText}
            disabled={props.disabled}
            placeholder={props.koPlaceholder}
            onChange={(event) => props.onOptionsChange(textToOptions(event.target.value, existingOptions, enText))}
          />
        </label>
        <label className="tg-builder-field">
          <span>영어</span>
          <textarea
            aria-label={`${props.label} 영어`}
            rows={props.rows ?? 6}
            value={enText}
            disabled={props.disabled}
            placeholder={props.enPlaceholder}
            onChange={(event) => props.onOptionsChange(textToOptions(koText, existingOptions, event.target.value))}
          />
        </label>
      </div>
    </div>
  );
}

function QuestionSetImportDialog(props: { surveyId: string; onClose: () => void }) {
  const previewQuery = useQuestionSetImportPreviewQuery(props.surveyId, questionSetTemplateId, true);
  const importMutation = useImportQuestionSetMutation();
  const preview = previewQuery.data;

  return (
    <div className="tg-builder-modal-backdrop" role="presentation">
      <section className="tg-builder-modal" role="dialog" aria-modal="true" aria-labelledby="question-set-import-title">
        <header className="tg-builder-modal__header">
          <div>
            <p>질문 세트</p>
            <h2 id="question-set-import-title">질문 목록 불러오기</h2>
          </div>
          <button type="button" className="tg-builder-icon-button" aria-label="닫기" onClick={props.onClose}>
            <X size={16} aria-hidden="true" />
          </button>
        </header>

        {previewQuery.isPending ? <LoadingState label="질문 목록을 분석하는 중" /> : null}
        {previewQuery.isError ? (
          <InlineAlert message="질문 목록을 불러오지 못했습니다." detail={getErrorDetail(previewQuery.error)} />
        ) : null}
        {preview ? <QuestionSetImportPreviewSummary preview={preview} /> : null}

        {importMutation.isError ? (
          <InlineAlert message="질문 목록을 삽입하지 못했습니다." detail={getErrorDetail(importMutation.error)} />
        ) : null}
        {importMutation.isSuccess ? (
          <InlineNotice
            message={`섹션 ${importMutation.data.sectionsCreated}개, 질문 ${importMutation.data.questionsCreated}개를 삽입했습니다.`}
          />
        ) : null}

        <footer className="tg-builder-modal__actions">
          <Button variant="secondary" onClick={props.onClose}>
            닫기
          </Button>
          <Button
            variant="primary"
            icon={importMutation.isPending ? <Loader2 size={16} aria-hidden="true" /> : <FilePlus2 size={16} aria-hidden="true" />}
            disabled={!preview || preview.importableQuestionCount === 0 || importMutation.isPending}
            onClick={() =>
              importMutation.mutate({
                surveyId: props.surveyId,
                templateId: questionSetTemplateId,
                conflictMode: "append_skip_existing_keys",
              })
            }
          >
            현재 설문에 삽입
          </Button>
        </footer>
      </section>
    </div>
  );
}

function QuestionSetImportPreviewSummary(props: { preview: QuestionSetImportPreview }) {
  const typeCounts = props.preview.questions.reduce<Record<string, number>>((acc, question) => {
    acc[getQuestionTypeLabel(question.questionType, question.config)] = (acc[getQuestionTypeLabel(question.questionType, question.config)] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="tg-builder-import-preview">
      <div className="tg-builder-import-preview__metrics">
        <Metric label="섹션" value={`${props.preview.totalSectionCount}개`} />
        <Metric label="질문" value={`${props.preview.totalQuestionCount}개`} />
        <Metric label="삽입 예정" value={`${props.preview.importableQuestionCount}개`} />
        <Metric label="중복 건너뜀" value={`${props.preview.skippedQuestionCount}개`} />
      </div>
      <div className="tg-builder-import-preview__body">
        <section>
          <h3>섹션 미리보기</h3>
          <ul>
            {props.preview.sections.map((section) => (
              <li key={section.sectionKey}>
                <strong>{section.title.ko}</strong>
                <span>{section.questionCount}개 질문{section.isExisting ? " · 기존 섹션 사용" : ""}</span>
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h3>질문 유형</h3>
          <ul>
            {Object.entries(typeCounts).map(([label, count]) => (
              <li key={label}>
                <strong>{label}</strong>
                <span>{count}개</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

function Metric(props: { label: string; value: string }) {
  return (
    <div className="tg-builder-import-preview__metric">
      <span>{props.label}</span>
      <strong>{props.value}</strong>
    </div>
  );
}

function IconButton(props: {
  label: string;
  icon: ReactNode;
  disabled?: boolean;
  onClick: MouseEventHandler<HTMLButtonElement>;
}) {
  return (
    <button
      type="button"
      className="tg-builder-icon-button"
      aria-label={props.label}
      title={props.label}
      disabled={props.disabled}
      onClick={props.onClick}
    >
      {props.icon}
    </button>
  );
}

function InlineAlert(props: { message: string; detail?: string }) {
  return (
    <div className="tg-builder-alert" role="alert">
      <AlertTriangle size={16} aria-hidden="true" />
      <span>
        {props.message}
        {props.detail ? <small>{props.detail}</small> : null}
      </span>
    </div>
  );
}

function InlineNotice(props: { message: string }) {
  return (
    <div className="tg-builder-alert tg-builder-alert--success" role="status">
      <CheckCircle2 size={16} aria-hidden="true" />
      <span>{props.message}</span>
    </div>
  );
}

function getErrorDetail(error: unknown): string | undefined {
  return error instanceof Error && error.message ? error.message : undefined;
}

function surveyToTitleForm(survey: Survey): EditSurveyForm {
  return {
    title: survey.title,
    descriptionKo: survey.description?.ko ?? "",
    descriptionEn: survey.description?.en ?? "",
  };
}

function sectionToEditForm(section: SurveySection | undefined): EditSectionForm {
  return {
    sectionKey: section?.sectionKey ?? "",
    titleKo: section?.title.ko ?? "",
    titleEn: section?.title.en ?? "",
    descriptionKo: section?.description?.ko ?? "",
    descriptionEn: section?.description?.en ?? "",
    sectionType: section?.sectionType ?? "general",
  };
}

function questionToEditForm(question: Question | undefined): EditQuestionForm {
  const questionKind = question ? getQuestionKind(question) : "scale";
  return {
    questionKey: question?.questionKey ?? "",
    titleKo: question ? getQuestionDisplayTitle(question) : "",
    titleEn: question?.title.en ?? "",
    descriptionKo: question?.description?.ko ?? "",
    descriptionEn: question?.description?.en ?? "",
    questionType: questionKind,
    isRequired: question?.isRequired ?? true,
    metricType: question?.metricType ?? "none",
    topicKey: question?.topicKey ?? "",
    spaceKey: question?.spaceKey ?? "",
    configJson: stringifyConfig(question?.config ?? defaultQuestionConfig(questionKind)),
  };
}

function toLocalizedText(ko: string, en?: string): LocalizedText {
  return en ? { ko, en } : { ko };
}

function toOptionalLocalizedText(ko?: string, en?: string): LocalizedText | undefined {
  if (!ko && !en) return undefined;
  return toLocalizedText(ko ?? "", en);
}

function defaultMetricType(questionType: QuestionKind): MetricType {
  if (questionType === "scale") return "satisfaction";
  if (questionType === "experience") return "experience";
  return "none";
}

function countQuestionsForSection(questions: Question[], sectionId: string): number {
  return questions.filter((question) => question.sectionId === sectionId).length;
}

function defaultQuestionConfig(questionType: QuestionKind): QuestionConfig {
  if (questionType === "profile") {
    return {
      profileField: "custom",
      inputType: "text",
      options: [],
    };
  }
  if (questionType === "scale") {
    return {
      scaleMin: 1,
      scaleMax: 5,
      labelsKo: ["매우 불만족", "불만족", "보통", "만족", "매우 만족"],
    };
  }
  if (questionType === "single_choice") {
    return { options: [{ value: "option_1", labelKo: "선택지 1" }] };
  }
  if (questionType === "multi_select" || questionType === "ranking") {
    return {
      minSelect: 1,
      options: [{ value: "option_1", labelKo: "선택지 1" }],
    };
  }
  if (questionType === "text") {
    return {
      textMode: "plain",
      multiline: true,
      maxLength: 1000,
    };
  }
  if (questionType === shortTextQuestionKind) {
    return {
      textMode: "short",
      multiline: false,
      maxLength: 200,
    };
  }
  if (questionType === choiceTextQuestionKind) {
    return {
      textMode: "choice_then_text",
      multiline: true,
      maxLength: 1000,
      options: defaultChoiceTextOptions,
    };
  }
  if (questionType === "image_tag") {
    return {
      maxTags: 3,
      tagTypes: ["불편"],
      requireText: true,
      enableZoom: true,
    };
  }
  if (questionType === "participant_image_tag") {
    return {
      maxTags: 3,
      tagTypes: ["불편", "수리 요청", "개선 제안"],
      requireText: true,
      enableZoom: true,
      acceptedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
      maxFileSizeMb: 10,
    };
  }
  if (questionType === "attention_check") {
    return {
      scaleMin: 1,
      scaleMax: 5,
      labelsKo: ["1점", "2점", "3점", "4점", "5점"],
      expectedValue: "3",
      excludeIfFailed: true,
    };
  }
  return {};
}

function toPersistedQuestionType(questionType: QuestionKind): QuestionType {
  return questionType === choiceTextQuestionKind || questionType === shortTextQuestionKind ? "text" : questionType;
}

function normalizeQuestionConfigForKind(questionType: QuestionKind, config: JsonRecord): QuestionConfig {
  if (questionType === shortTextQuestionKind) {
    return {
      ...config,
      textMode: "short",
      multiline: false,
      maxLength: typeof config.maxLength === "number" ? config.maxLength : 200,
    } as QuestionConfig;
  }
  if (questionType === "text") {
    return {
      ...config,
      textMode: "plain",
      multiline: typeof config.multiline === "boolean" ? config.multiline : true,
    } as QuestionConfig;
  }
  if (questionType === choiceTextQuestionKind) {
    const options = getChoiceOptions(config);
    return {
      ...config,
      textMode: "choice_then_text",
      multiline: typeof config.multiline === "boolean" ? config.multiline : true,
      options: options.length ? options : defaultChoiceTextOptions,
    } as QuestionConfig;
  }
  if (questionType === "attention_check") {
    return {
      ...config,
      scaleMin: typeof config.scaleMin === "number" ? config.scaleMin : 1,
      scaleMax: typeof config.scaleMax === "number" ? config.scaleMax : 5,
      labelsKo: Array.isArray(config.labelsKo) ? config.labelsKo : ["1점", "2점", "3점", "4점", "5점"],
      expectedValue: typeof config.expectedValue === "number" || typeof config.expectedValue === "string" ? String(config.expectedValue) : "3",
      excludeIfFailed: true,
    } as QuestionConfig;
  }
  return config as QuestionConfig;
}

function getQuestionKind(question: Question): QuestionKind {
  if (question.questionType === "text" && isShortTextConfig(question.config)) return shortTextQuestionKind;
  if (question.questionType === "text" && isChoiceTextConfig(question.config)) return choiceTextQuestionKind;
  return question.questionType;
}

function getQuestionKindOptions(question: Question): Array<{ value: QuestionKind; label: string }> {
  const current = getQuestionKind(question);
  if (visibleQuestionTypes.some((type) => type.value === current)) return visibleQuestionTypes;
  const legacyType = legacyQuestionTypes.find((type) => type.value === current);
  return legacyType ? [...visibleQuestionTypes, legacyType] : visibleQuestionTypes;
}

function isChoiceTextConfig(config: QuestionConfig | JsonRecord | undefined): boolean {
  if (!config || typeof config !== "object" || Array.isArray(config)) return false;
  const record = config as JsonRecord;
  return (
    record.textMode === "choice_then_text" ||
    record.inputMode === "choice_then_text" ||
    record.choiceFirst === true ||
    Array.isArray(record.options)
  );
}

function isShortTextConfig(config: QuestionConfig | JsonRecord | undefined): boolean {
  if (!config || typeof config !== "object" || Array.isArray(config)) return false;
  const record = config as JsonRecord;
  return record.textMode === "short" || record.inputMode === "short" || (record.multiline === false && !Array.isArray(record.options));
}

function withDisplayGroup(config: QuestionConfig, displayGroup?: string): QuestionConfig {
  const nextConfig: JsonRecord = { ...(config as JsonRecord) };
  const normalized = displayGroup?.trim();
  if (normalized) {
    nextConfig.displayGroup = normalized;
  } else {
    delete nextConfig.displayGroup;
  }
  return nextConfig as QuestionConfig;
}

function getDisplayGroupFromConfig(config: QuestionConfig | JsonRecord | undefined): string {
  if (!config || typeof config !== "object" || Array.isArray(config)) return "";
  const value = (config as JsonRecord).displayGroup;
  return typeof value === "string" ? value : "";
}

function getQuestionDisplayTitle(question: Question): string {
  const itemTitle = extractDisplayGroupItemTitle(question.title.ko, getDisplayGroupFromConfig(question.config));
  return itemTitle || question.title.ko;
}

function extractDisplayGroupItemTitle(title: string, displayGroup: string): string {
  if (!displayGroup) return title;
  const bracketLabel = extractTrailingBracketLabel(title);
  if (bracketLabel) return stripItemNumber(bracketLabel);

  const trimmedTitle = title.trim();
  const trimmedGroup = displayGroup.trim();
  if (!trimmedTitle.startsWith(trimmedGroup)) return trimmedTitle;

  return stripItemNumber(stripWrappingBrackets(trimmedTitle.slice(trimmedGroup.length).trim())) || trimmedTitle;
}

function extractTrailingBracketLabel(value: string): string | undefined {
  const match = value.match(/\[([^\]]+)\]\s*$/);
  return match?.[1]?.trim();
}

function stripWrappingBrackets(value: string): string {
  const trimmed = value.trim();
  const match = trimmed.match(/^\[([^\]]+)\]$/);
  return match?.[1]?.trim() ?? trimmed;
}

function stripItemNumber(value: string): string {
  return value
    .trim()
    .replace(/^\((\d+)\)\s*/, "")
    .replace(/^\d+[.)]\s*/, "")
    .trim();
}

function stringifyConfig(config: QuestionConfig): string {
  return JSON.stringify(config, null, 2);
}

function parseJsonRecord(value: string): JsonRecord | null {
  try {
    const parsed = JSON.parse(value);
    if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") return null;
    return parsed as JsonRecord;
  } catch {
    return null;
  }
}

function createStableKey(value: string, fallbackPrefix: string): string {
  const normalized = value
    .trim()
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return normalized || `${fallbackPrefix}_${Date.now().toString(36)}`;
}

function moveId(ids: string[], id: string, direction: -1 | 1): string[] | undefined {
  const index = ids.indexOf(id);
  const nextIndex = index + direction;
  if (index < 0 || nextIndex < 0 || nextIndex >= ids.length) return undefined;
  const next = [...ids];
  [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
  return next;
}

function getQuestionInsertionIndex(questions: Question[], afterQuestionId?: string): number {
  if (!afterQuestionId) return questions.length;
  const afterIndex = questions.findIndex((question) => question.id === afterQuestionId);
  return afterIndex >= 0 ? afterIndex + 1 : questions.length;
}

function insertIdAt(ids: string[], id: string, index: number): string[] {
  const next = ids.filter((currentId) => currentId !== id);
  next.splice(Math.min(Math.max(index, 0), next.length), 0, id);
  return next;
}

function insertIdsAt(ids: string[], idsToInsert: string[], index: number): string[] {
  const inserting = idsToInsert.filter(Boolean);
  const next = ids.filter((currentId) => !inserting.includes(currentId));
  next.splice(Math.min(Math.max(index, 0), next.length), 0, ...inserting);
  return next;
}

function createGroupedQuestionKey(prefix: string, index: number): string {
  const suffix = (index + 1).toString().padStart(2, "0");
  const maxPrefixLength = 80 - suffix.length - 1;
  return `${prefix.slice(0, maxPrefixLength)}_${suffix}`;
}

function getQuestionTypeLabel(type: QuestionType, config?: QuestionConfig | JsonRecord): string {
  if (type === "text" && isShortTextConfig(config)) return "단답형";
  if (type === "text" && isChoiceTextConfig(config)) return "선택후 주관식";
  return allQuestionKinds.find((item) => item.value === type)?.label ?? type;
}

function getMetricTypeLabel(type: MetricType): string {
  return metricTypes.find((item) => item.value === type)?.label ?? type;
}

function splitLines(value: string): string[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function optionsToText(config: JsonRecord, locale: "ko" | "en" = "ko"): string {
  const labels = getChoiceOptions(config).map((option) => (locale === "en" ? option.labelEn ?? "" : option.labelKo));
  if (locale === "en") return trimTrailingEmptyLines(labels).join("\n");
  return labels.filter(Boolean).join("\n");
}

function textToOptions(value: string, existingOptions: Array<{ value: string; labelKo: string; labelEn?: string }> = [], enValue?: string) {
  const englishLabels = typeof enValue === "string" ? splitOptionLines(enValue) : undefined;
  return splitLines(value).map((label, index) => {
    const labelEn = englishLabels ? englishLabels[index]?.trim() : existingOptions[index]?.labelEn?.trim();
    return {
      value: existingOptions[index]?.value ?? `option_${index + 1}`,
      labelKo: label,
      ...(labelEn ? { labelEn } : {}),
    };
  });
}

function getChoiceOptions(config: JsonRecord): Array<{ value: string; labelKo: string; labelEn?: string }> {
  return getNormalizedChoiceOptions(config);
}

function splitOptionLines(value: string): string[] {
  return value.split("\n").map((line) => line.trim());
}

function trimTrailingEmptyLines(values: string[]): string[] {
  const next = [...values];
  while (next.length > 0 && !next[next.length - 1]) {
    next.pop();
  }
  return next;
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function groupQuestionsForDisplay(questions: Question[]): Array<{ key: string; label?: string; questions: Question[] }> {
  const groups: Array<{ key: string; label?: string; questions: Question[] }> = [];
  for (const question of questions) {
    const groupLabel = getDisplayGroupFromConfig(question.config) || undefined;
    const key = groupLabel ?? question.id;
    const existing = groups.find((group) => group.key === key);
    if (existing) {
      existing.questions.push(question);
    } else {
      groups.push({ key, label: groupLabel, questions: [question] });
    }
  }
  return groups;
}
