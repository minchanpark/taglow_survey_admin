import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Copy,
  FilePlus2,
  FileText,
  Loader2,
  Plus,
  Save,
  Trash2,
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
  useUpdateQuestionMutation,
  useUpdateSectionMutation,
} from "../../../api/admin/query";
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
  SurveySection,
} from "../../../api/admin/model";
import { Button, EmptyState, ErrorState, LoadingState, StatusBadge } from "../../../components";
import { useAdminBuilderStore } from "../../../store";
import "./css/SurveyBuilderPage.css";

const questionSetTemplateId: QuestionSetTemplateId = "dorm_regular_25_2";

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

const questionTypes: Array<{ value: QuestionType; label: string }> = [
  { value: "profile", label: "기본 정보" },
  { value: "experience", label: "경험 여부" },
  { value: "scale", label: "척도" },
  { value: "single_choice", label: "단일 선택" },
  { value: "multi_select", label: "복수 선택" },
  { value: "ranking", label: "순위" },
  { value: "text", label: "주관식" },
  { value: "image_tag", label: "이미지 태깅" },
  { value: "attention_check", label: "주의력 확인" },
];

const metricTypes: Array<{ value: MetricType; label: string }> = [
  { value: "none", label: "없음" },
  { value: "satisfaction", label: "만족도" },
  { value: "importance", label: "중요도" },
  { value: "experience", label: "경험" },
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

const createQuestionSchema = z.object({
  titleKo: z.string().trim().min(1, "질문 제목을 입력해주세요.").max(220, "질문 제목은 220자 이하로 입력해주세요."),
  questionKey: z.string().trim().max(80, "질문 키는 80자 이하로 입력해주세요.").regex(keyRegex, "영문 소문자, 숫자, 밑줄만 사용할 수 있습니다.").optional(),
  questionType: z.custom<QuestionType>((value) => questionTypes.some((type) => type.value === value), "질문 유형을 선택해주세요."),
});

const editQuestionSchema = z.object({
  questionKey: z.string().trim().max(80, "질문 키는 80자 이하로 입력해주세요.").regex(keyRegex, "영문 소문자, 숫자, 밑줄만 사용할 수 있습니다.").optional(),
  titleKo: z.string().trim().min(1, "질문 제목을 입력해주세요.").max(220, "질문 제목은 220자 이하로 입력해주세요."),
  titleEn: z.string().trim().max(220, "영문 제목은 220자 이하로 입력해주세요.").optional(),
  descriptionKo: z.string().trim().max(500, "설명은 500자 이하로 입력해주세요.").optional(),
  descriptionEn: z.string().trim().max(500, "영문 설명은 500자 이하로 입력해주세요.").optional(),
  questionType: z.custom<QuestionType>((value) => questionTypes.some((type) => type.value === value), "질문 유형을 선택해주세요."),
  isRequired: z.boolean(),
  metricType: z.custom<MetricType>((value) => metricTypes.some((type) => type.value === value), "분석 지표를 선택해주세요."),
  topicKey: z.string().trim().max(80, "topic key는 80자 이하로 입력해주세요.").optional(),
  spaceKey: z.string().trim().max(80, "space key는 80자 이하로 입력해주세요.").optional(),
  configJson: z.string().refine((value) => parseJsonRecord(value) !== null, "config는 JSON object 형식이어야 합니다."),
});

type CreateSectionForm = z.infer<typeof createSectionSchema>;
type EditSectionForm = z.infer<typeof editSectionSchema>;
type CreateQuestionForm = z.infer<typeof createQuestionSchema>;
type EditQuestionForm = z.infer<typeof editQuestionSchema>;

export function SurveyBuilderPage() {
  const { surveyId = "" } = useParams();
  const detailQuery = useSurveyDetailQuery(surveyId);
  const [isImportOpen, setImportOpen] = useState(false);
  const {
    selectedSectionId,
    selectedQuestionId,
    setSelectedSurveyId,
    setSelectedSectionId,
    setSelectedQuestionId,
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
  const isStructureLocked = detailQuery.data?.survey.status !== "draft";

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
      setSelectedQuestionId(sectionQuestions[0]?.id);
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

  return (
    <section className="tg-builder-page" aria-labelledby="survey-builder-title">
      <header className="tg-builder-page__header">
        <div>
          <p className="tg-builder-page__eyebrow">설문 빌더</p>
          <h1 id="survey-builder-title">{detailQuery.data.survey.title}</h1>
        </div>
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
        <InlineAlert message="게시 또는 종료된 설문은 구조 수정이 제한됩니다." detail="질문을 바꾸려면 설정에서 다음 버전을 만든 뒤 편집해주세요." />
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
            setSelectedSectionId(sectionId);
            setSelectedQuestionId(undefined);
          }}
        />
        <QuestionPanel
          surveyId={surveyId}
          selectedSection={selectedSection}
          questions={sectionQuestions}
          selectedQuestion={selectedQuestion}
          isStructureLocked={isStructureLocked}
          onSelectQuestion={(questionId) => setSelectedQuestionId(questionId)}
        />
        <QuestionEditor surveyId={surveyId} question={selectedQuestion} isStructureLocked={isStructureLocked} />
      </div>

      {isImportOpen ? <QuestionSetImportDialog surveyId={surveyId} onClose={() => setImportOpen(false)} /> : null}
    </section>
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
}) {
  const createQuestionMutation = useCreateQuestionMutation();
  const reorderQuestionsMutation = useReorderQuestionsMutation();
  const setSelectedQuestionId = useAdminBuilderStore((state) => state.setSelectedQuestionId);
  const createForm = useForm<CreateQuestionForm>({
    resolver: zodResolver(createQuestionSchema),
    defaultValues: { titleKo: "", questionKey: "", questionType: "scale" },
  });
  const watchedType = createForm.watch("questionType");
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

      <form
        className="tg-builder-create"
        onSubmit={createForm.handleSubmit((values) => {
          const metricType = defaultMetricType(values.questionType);
          createQuestionMutation.mutate(
            {
              surveyId: props.surveyId,
              sectionId: selectedSection.id,
              questionKey: values.questionKey || createStableKey(values.titleKo, "question"),
              questionType: values.questionType,
              title: { ko: values.titleKo },
              orderIndex: props.questions.length,
              isRequired: true,
              metricType,
              config: defaultQuestionConfig(values.questionType),
              validation: {},
            },
            {
              onSuccess: (question) => {
                createForm.reset({ titleKo: "", questionKey: "", questionType: "scale" });
                setSelectedQuestionId(question.id);
              },
            },
          );
        })}
      >
        <label className="tg-builder-field">
          <span>새 질문</span>
          <input aria-label="새 질문" placeholder="예: 침대 상태에 만족하시나요?" {...createForm.register("titleKo")} disabled={isBusy} />
          {createForm.formState.errors.titleKo ? <small>{createForm.formState.errors.titleKo.message}</small> : null}
        </label>
        <label className="tg-builder-field">
          <span>질문 유형</span>
          <select aria-label="질문 유형" {...createForm.register("questionType")} disabled={isBusy}>
            {questionTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </label>
        <details className="tg-builder-advanced">
          <summary>고급 설정</summary>
          <label className="tg-builder-field">
            <span>질문 키</span>
            <input aria-label="질문 키" placeholder="자동 생성" {...createForm.register("questionKey")} disabled={isBusy} />
          </label>
          {createForm.formState.errors.questionKey ? <small>{createForm.formState.errors.questionKey.message}</small> : null}
        </details>
        <p className="tg-builder-hint">기본 설정: {getQuestionTypeLabel(watchedType)}</p>
        <Button
          type="submit"
          variant="secondary"
          icon={<FilePlus2 size={16} aria-hidden="true" />}
          disabled={isBusy}
        >
          질문 추가
        </Button>
        {createQuestionMutation.isError ? (
          <InlineAlert message="질문을 추가하지 못했습니다." detail={getErrorDetail(createQuestionMutation.error)} />
        ) : null}
        {createQuestionMutation.isSuccess ? <InlineNotice message="질문이 추가되었습니다." /> : null}
      </form>

      <div className="tg-builder-list" role="list" aria-label="질문 목록">
        {props.questions.length ? (
          groupedQuestions.map((group) => (
            <div key={group.key} className="tg-builder-question-group">
              {group.label ? <p className="tg-builder-question-group__title">{group.label}</p> : null}
              {group.questions.map((question) => (
                <div
                  key={question.id}
                  className={`tg-builder-list__item ${question.id === props.selectedQuestion?.id ? "tg-builder-list__item--active" : ""}`}
                >
                  <button
                    type="button"
                    className="tg-builder-list__item-main"
                    aria-label={`${question.title.ko} 질문 선택`}
                    onClick={() => props.onSelectQuestion(question.id)}
                  >
                    <strong>{question.title.ko}</strong>
                    <span>{getQuestionTypeLabel(question.questionType)} · {getMetricTypeLabel(question.metricType)}</span>
                  </button>
                  <div className="tg-builder-list__item-meta">
                    <IconButton
                      label="위로 이동"
                      disabled={isBusy || props.questions.indexOf(question) === 0}
                      onClick={() => moveQuestion(question.id, -1)}
                      icon={<ArrowUp size={15} aria-hidden="true" />}
                    />
                    <IconButton
                      label="아래로 이동"
                      disabled={isBusy || props.questions.indexOf(question) === props.questions.length - 1}
                      onClick={() => moveQuestion(question.id, 1)}
                      icon={<ArrowDown size={15} aria-hidden="true" />}
                    />
                    <IconButton
                      label="질문 복제"
                      disabled={isBusy}
                      onClick={() => duplicateQuestion(question)}
                      icon={<Copy size={15} aria-hidden="true" />}
                    />
                  </div>
                </div>
              ))}
            </div>
          ))
        ) : (
          <EmptyState title="질문이 없습니다." description="선택한 섹션에 질문을 추가해주세요." />
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
    createQuestionMutation.mutate({
      surveyId: props.surveyId,
      sectionId: selectedSection.id,
      questionKey: `${question.questionKey}_copy_${Date.now().toString(36)}`,
      questionType: question.questionType,
      title: { ko: `${question.title.ko} 복사본`, en: question.title.en },
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

function QuestionEditor(props: { surveyId: string; question?: Question; isStructureLocked: boolean }) {
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

  if (!props.question) {
    return (
      <aside className="tg-builder-panel tg-builder-panel--editor" aria-label="질문 편집">
        <EmptyState title="선택된 질문이 없습니다." description="질문을 추가하거나 목록에서 선택해주세요." />
      </aside>
    );
  }

  const question = props.question;

  return (
    <aside className="tg-builder-panel tg-builder-panel--editor" aria-label="질문 편집">
      <div className="tg-builder-panel__title-row">
        <h2>질문 편집</h2>
        <StatusBadge tone="info">{getQuestionTypeLabel(question.questionType)}</StatusBadge>
      </div>

      <form
        className="tg-builder-edit"
        onSubmit={editForm.handleSubmit((values) => {
          const config = parseJsonRecord(values.configJson) ?? {};
          updateQuestionMutation.mutate({
            surveyId: props.surveyId,
            questionId: question.id,
            questionKey: values.questionKey || question.questionKey,
            questionType: values.questionType,
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
                  const questionType = event.target.value as QuestionType;
                  editForm.setValue("metricType", defaultMetricType(questionType), { shouldDirty: true, shouldValidate: true });
                  editForm.setValue("configJson", stringifyConfig(defaultQuestionConfig(questionType)), {
                    shouldDirty: true,
                    shouldValidate: true,
                  });
                },
              })}
              disabled={isBusy}
            >
              {questionTypes.map((type) => (
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

function QuestionConfigFields(props: {
  questionType: QuestionType;
  configJson: string;
  disabled: boolean;
  onConfigChange: (configJson: string) => void;
}) {
  const config = parseJsonRecord(props.configJson) ?? {};
  const setConfig = (patch: JsonRecord) => props.onConfigChange(stringifyConfig({ ...config, ...patch } as QuestionConfig));

  if (props.questionType === "scale") {
    const labels = Array.isArray(config.labelsKo) ? config.labelsKo.filter((label): label is string => typeof label === "string") : [];
    return (
      <div className="tg-builder-config-panel">
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
        <label className="tg-builder-field">
          <span>척도 라벨</span>
          <textarea
            rows={5}
            value={labels.join("\n")}
            disabled={props.disabled}
            onChange={(event) => setConfig({ labelsKo: splitLines(event.target.value) })}
          />
        </label>
      </div>
    );
  }

  if (props.questionType === "single_choice" || props.questionType === "multi_select" || props.questionType === "ranking") {
    return (
      <div className="tg-builder-config-panel">
        <label className="tg-builder-field">
          <span>선택지</span>
          <textarea
            rows={6}
            value={optionsToText(config)}
            disabled={props.disabled}
            onChange={(event) => setConfig({ options: textToOptions(event.target.value) })}
          />
        </label>
      </div>
    );
  }

  if (props.questionType === "attention_check") {
    return (
      <div className="tg-builder-config-panel">
        <label className="tg-builder-field">
          <span>정답으로 선택해야 할 값</span>
          <input
            value={typeof config.expectedValue === "string" ? config.expectedValue : ""}
            disabled={props.disabled}
            onChange={(event) => setConfig({ expectedValue: event.target.value, excludeIfFailed: true })}
          />
        </label>
      </div>
    );
  }

  if (props.questionType === "image_tag") {
    const tagTypes = Array.isArray(config.tagTypes) ? config.tagTypes.filter((tag): tag is string => typeof tag === "string") : [];
    return (
      <div className="tg-builder-config-panel">
        <label className="tg-builder-field">
          <span>최대 태그 수</span>
          <input
            type="number"
            value={Number(config.maxTags ?? 3)}
            disabled={props.disabled}
            onChange={(event) => setConfig({ maxTags: Number(event.target.value) })}
          />
        </label>
        <label className="tg-builder-field">
          <span>태그 유형</span>
          <textarea
            rows={4}
            value={tagTypes.join("\n")}
            disabled={props.disabled}
            onChange={(event) => setConfig({ tagTypes: splitLines(event.target.value) })}
          />
        </label>
      </div>
    );
  }

  return (
    <div className="tg-builder-config-panel tg-builder-config-panel--quiet">
      <span>{getQuestionTypeLabel(props.questionType)} 문항은 기본 설정으로 저장됩니다.</span>
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
    acc[getQuestionTypeLabel(question.questionType)] = (acc[getQuestionTypeLabel(question.questionType)] ?? 0) + 1;
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
    <button type="button" className="tg-builder-icon-button" aria-label={props.label} disabled={props.disabled} onClick={props.onClick}>
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
  return {
    questionKey: question?.questionKey ?? "",
    titleKo: question?.title.ko ?? "",
    titleEn: question?.title.en ?? "",
    descriptionKo: question?.description?.ko ?? "",
    descriptionEn: question?.description?.en ?? "",
    questionType: question?.questionType ?? "scale",
    isRequired: question?.isRequired ?? true,
    metricType: question?.metricType ?? "none",
    topicKey: question?.topicKey ?? "",
    spaceKey: question?.spaceKey ?? "",
    configJson: stringifyConfig(question?.config ?? defaultQuestionConfig(question?.questionType ?? "scale")),
  };
}

function toLocalizedText(ko: string, en?: string): LocalizedText {
  return en ? { ko, en } : { ko };
}

function toOptionalLocalizedText(ko?: string, en?: string): LocalizedText | undefined {
  if (!ko && !en) return undefined;
  return toLocalizedText(ko ?? "", en);
}

function defaultMetricType(questionType: QuestionType): MetricType {
  if (questionType === "scale") return "satisfaction";
  if (questionType === "experience") return "experience";
  return "none";
}

function countQuestionsForSection(questions: Question[], sectionId: string): number {
  return questions.filter((question) => question.sectionId === sectionId).length;
}

function defaultQuestionConfig(questionType: QuestionType): QuestionConfig {
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
  if (questionType === "image_tag") {
    return {
      maxTags: 3,
      tagTypes: ["불편"],
      requireText: true,
      enableZoom: true,
    };
  }
  if (questionType === "attention_check") {
    return {
      expectedValue: "확인",
      excludeIfFailed: true,
    };
  }
  return {};
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

function getQuestionTypeLabel(type: QuestionType): string {
  return questionTypes.find((item) => item.value === type)?.label ?? type;
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

function optionsToText(config: JsonRecord): string {
  const options = Array.isArray(config.options) ? config.options : [];
  return options
    .map((option) => {
      if (!isRecord(option)) return "";
      return typeof option.labelKo === "string" ? option.labelKo : typeof option.value === "string" ? option.value : "";
    })
    .filter(Boolean)
    .join("\n");
}

function textToOptions(value: string) {
  return splitLines(value).map((label, index) => ({
    value: `option_${index + 1}`,
    labelKo: label,
  }));
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function groupQuestionsForDisplay(questions: Question[]): Array<{ key: string; label?: string; questions: Question[] }> {
  const groups: Array<{ key: string; label?: string; questions: Question[] }> = [];
  for (const question of questions) {
    const config = question.config as JsonRecord;
    const groupLabel = typeof config.displayGroup === "string" ? config.displayGroup : undefined;
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
