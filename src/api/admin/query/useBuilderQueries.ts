import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useAdminApiController } from "../controller/adminApiControllerProvider";
import type {
  CreateQuestionCommand,
  CreateSectionCommand,
  QuestionSetImportCommand,
  QuestionSetTemplateId,
  Question,
  ReorderQuestionsCommand,
  ReorderSectionsCommand,
  SurveyDetail,
  SurveySection,
  UpdateQuestionCommand,
  UpdateSectionCommand,
} from "../model";
import { adminQueryKeys } from "./queryKeys";

export function useSectionsQuery(surveyId: string) {
  return useSurveyDetailSliceQuery(surveyId, "sections");
}

export function useQuestionsQuery(surveyId: string) {
  return useSurveyDetailSliceQuery(surveyId, "questions");
}

export function useAssetsQuery(surveyId: string) {
  return useSurveyDetailSliceQuery(surveyId, "assets");
}

export function useQuestionSetImportPreviewQuery(surveyId: string, templateId: QuestionSetTemplateId, enabled: boolean) {
  const controller = useAdminApiController();
  return useQuery({
    queryKey: adminQueryKeys.questionSetImportPreview(surveyId, templateId),
    queryFn: () => controller.previewQuestionSetImport({ surveyId, templateId }),
    enabled: Boolean(surveyId) && enabled,
  });
}

export function useImportQuestionSetMutation() {
  const controller = useAdminApiController();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (command: QuestionSetImportCommand) => controller.importQuestionSet(command),
    onSuccess: (_result, command) => {
      invalidateBuilder(queryClient, command.surveyId);
      void queryClient.invalidateQueries({ queryKey: adminQueryKeys.questionSetImportPreview(command.surveyId, command.templateId) });
    },
  });
}

export function useCreateSectionMutation() {
  const controller = useAdminApiController();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (command: CreateSectionCommand) => controller.createSection(command),
    onSuccess: (section) => {
      setSurveyDetail(queryClient, section.surveyId, (detail) => ({
        ...detail,
        sections: upsertById(detail.sections, section),
      }));
      setListQuery(queryClient, adminQueryKeys.sections(section.surveyId), (sections: SurveySection[]) => upsertById(sections, section));
      invalidateBuilder(queryClient, section.surveyId);
    },
  });
}

export function useUpdateSectionMutation() {
  const controller = useAdminApiController();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (command: UpdateSectionCommand & { surveyId: string }) => controller.updateSection(command),
    onSuccess: (section, command) => {
      setSurveyDetail(queryClient, command.surveyId, (detail) => ({
        ...detail,
        sections: upsertById(detail.sections, section),
      }));
      setListQuery(queryClient, adminQueryKeys.sections(command.surveyId), (sections: SurveySection[]) => upsertById(sections, section));
      invalidateBuilder(queryClient, command.surveyId);
    },
  });
}

export function useReorderSectionsMutation() {
  const controller = useAdminApiController();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (command: ReorderSectionsCommand) => controller.reorderSections(command),
    onSuccess: (_sections, command) => invalidateBuilder(queryClient, command.surveyId),
  });
}

export function useDeleteSectionMutation() {
  const controller = useAdminApiController();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (command: { surveyId: string; sectionId: string }) => controller.deleteSection(command.sectionId),
    onSuccess: (_result, command) => {
      setSurveyDetail(queryClient, command.surveyId, (detail) => ({
        ...detail,
        sections: detail.sections.filter((section) => section.id !== command.sectionId),
        questions: detail.questions.filter((question) => question.sectionId !== command.sectionId),
      }));
      setListQuery(queryClient, adminQueryKeys.sections(command.surveyId), (sections: SurveySection[]) =>
        sections.filter((section) => section.id !== command.sectionId),
      );
      setListQuery(queryClient, adminQueryKeys.questions(command.surveyId), (questions: Question[]) =>
        questions.filter((question) => question.sectionId !== command.sectionId),
      );
      invalidateBuilder(queryClient, command.surveyId);
    },
  });
}

export function useCreateQuestionMutation() {
  const controller = useAdminApiController();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (command: CreateQuestionCommand) => controller.createQuestion(command),
    onSuccess: (question) => {
      setSurveyDetail(queryClient, question.surveyId, (detail) => ({
        ...detail,
        questions: upsertById(detail.questions, question),
      }));
      setListQuery(queryClient, adminQueryKeys.questions(question.surveyId), (questions: Question[]) => upsertById(questions, question));
      invalidateBuilder(queryClient, question.surveyId);
    },
  });
}

export function useUpdateQuestionMutation() {
  const controller = useAdminApiController();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (command: UpdateQuestionCommand & { surveyId: string }) => controller.updateQuestion(command),
    onSuccess: (question, command) => {
      setSurveyDetail(queryClient, command.surveyId, (detail) => ({
        ...detail,
        questions: upsertById(detail.questions, question),
      }));
      setListQuery(queryClient, adminQueryKeys.questions(command.surveyId), (questions: Question[]) => upsertById(questions, question));
      invalidateBuilder(queryClient, command.surveyId);
    },
  });
}

export function useReorderQuestionsMutation() {
  const controller = useAdminApiController();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (command: ReorderQuestionsCommand) => controller.reorderQuestions(command),
    onMutate: (command) => {
      applyQuestionOrder(queryClient, command);
    },
    onSuccess: (questions, command) => {
      applyQuestionOrder(queryClient, command);
      if (questions.length) {
        setSurveyDetail(queryClient, command.surveyId, (detail) => ({
          ...detail,
          questions: mergeQuestions(detail.questions, questions),
        }));
        setListQuery(queryClient, adminQueryKeys.questions(command.surveyId), (items: Question[]) =>
          mergeQuestions(items, questions),
        );
      }
      invalidateBuilder(queryClient, command.surveyId);
    },
    onError: (_error, command) => {
      invalidateBuilder(queryClient, command.surveyId);
    },
  });
}

export function useDeleteQuestionMutation() {
  const controller = useAdminApiController();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (command: { surveyId: string; questionId: string }) => controller.deleteQuestion(command.questionId),
    onSuccess: (_result, command) => {
      setSurveyDetail(queryClient, command.surveyId, (detail) => ({
        ...detail,
        questions: detail.questions.filter((question) => question.id !== command.questionId),
      }));
      setListQuery(queryClient, adminQueryKeys.questions(command.surveyId), (questions: Question[]) =>
        questions.filter((question) => question.id !== command.questionId),
      );
      invalidateBuilder(queryClient, command.surveyId);
    },
  });
}

function useSurveyDetailSliceQuery<TKey extends "sections" | "questions" | "assets">(surveyId: string, key: TKey) {
  const controller = useAdminApiController();
  const queryKey =
    key === "sections"
      ? adminQueryKeys.sections(surveyId)
      : key === "questions"
        ? adminQueryKeys.questions(surveyId)
        : adminQueryKeys.assets(surveyId);

  return useQuery({
    queryKey,
    queryFn: async () => {
      const detail = await controller.getSurveyDetail(surveyId);
      return detail[key];
    },
    enabled: Boolean(surveyId),
  });
}

function invalidateBuilder(queryClient: ReturnType<typeof useQueryClient>, surveyId: string) {
  void queryClient.invalidateQueries({ queryKey: adminQueryKeys.survey(surveyId) });
  void queryClient.invalidateQueries({ queryKey: adminQueryKeys.sections(surveyId) });
  void queryClient.invalidateQueries({ queryKey: adminQueryKeys.questions(surveyId) });
  void queryClient.invalidateQueries({ queryKey: adminQueryKeys.assets(surveyId) });
  void queryClient.invalidateQueries({ queryKey: adminQueryKeys.previewRoot(surveyId) });
  void queryClient.invalidateQueries({ queryKey: adminQueryKeys.filterOptions(surveyId) });
  void queryClient.invalidateQueries({ queryKey: adminQueryKeys.analysisRoot(surveyId) });
}

function setSurveyDetail(queryClient: QueryClient, surveyId: string, updater: (detail: SurveyDetail) => SurveyDetail) {
  queryClient.setQueryData<SurveyDetail>(adminQueryKeys.survey(surveyId), (detail) => (detail ? updater(detail) : detail));
}

function setListQuery<TItem>(queryClient: QueryClient, queryKey: readonly unknown[], updater: (items: TItem[]) => TItem[]) {
  queryClient.setQueryData<TItem[]>(queryKey, (items) => (items ? updater(items) : items));
}

function upsertById<TItem extends { id: string; orderIndex?: number }>(items: readonly TItem[], item: TItem): TItem[] {
  const next = items.some((current) => current.id === item.id)
    ? items.map((current) => (current.id === item.id ? item : current))
    : [...items, item];
  return [...next].sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
}

function applyQuestionOrder(queryClient: QueryClient, command: ReorderQuestionsCommand) {
  const orderById = new Map(command.questionIds.map((questionId, index) => [questionId, index]));
  const reorder = (questions: Question[]) =>
    sortQuestionsWithinSections(
      questions.map((question) =>
        question.sectionId === command.sectionId && orderById.has(question.id)
          ? { ...question, orderIndex: orderById.get(question.id) ?? question.orderIndex }
          : question,
      ),
    );

  setSurveyDetail(queryClient, command.surveyId, (detail) => ({
    ...detail,
    questions: reorder(detail.questions),
  }));
  setListQuery(queryClient, adminQueryKeys.questions(command.surveyId), reorder);
}

function mergeQuestions(items: readonly Question[], questions: readonly Question[]): Question[] {
  const updatedById = new Map(questions.map((question) => [question.id, question]));
  const existingIds = new Set(items.map((item) => item.id));
  return sortQuestionsWithinSections(
    [
      ...items.map((item) => {
        const updated = updatedById.get(item.id);
        return updated ?? item;
      }),
      ...questions.filter((question) => !existingIds.has(question.id)),
    ],
  );
}

function sortQuestionsWithinSections(questions: readonly Question[]): Question[] {
  return [...questions].sort((a, b) => (a.sectionId === b.sectionId ? a.orderIndex - b.orderIndex : 0));
}
