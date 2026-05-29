import { create } from "zustand";

type AdminBuilderState = Readonly<{
  selectedSurveyId?: string;
  selectedSectionId?: string;
  selectedQuestionId?: string;
  questionCreatePlacement?: QuestionCreatePlacement;
  isLeftPanelOpen: boolean;
  setSelectedSurveyId: (surveyId: string | undefined) => void;
  setSelectedSectionId: (sectionId: string | undefined) => void;
  setSelectedQuestionId: (questionId: string | undefined) => void;
  startQuestionCreate: (sectionId: string, afterQuestionId?: string) => void;
  clearQuestionCreate: () => void;
  setLeftPanelOpen: (isOpen: boolean) => void;
  resetBuilderSelection: () => void;
}>;

type QuestionCreatePlacement = Readonly<{
  sectionId: string;
  afterQuestionId?: string;
}>;

export const useAdminBuilderStore = create<AdminBuilderState>((set) => ({
  selectedSurveyId: undefined,
  selectedSectionId: undefined,
  selectedQuestionId: undefined,
  questionCreatePlacement: undefined,
  isLeftPanelOpen: true,
  setSelectedSurveyId: (surveyId) =>
    set((state) => ({
      selectedSurveyId: surveyId,
      selectedSectionId: surveyId === state.selectedSurveyId ? state.selectedSectionId : undefined,
      selectedQuestionId: surveyId === state.selectedSurveyId ? state.selectedQuestionId : undefined,
      questionCreatePlacement: surveyId === state.selectedSurveyId ? state.questionCreatePlacement : undefined,
    })),
  setSelectedSectionId: (sectionId) =>
    set({
      selectedSectionId: sectionId,
      selectedQuestionId: undefined,
      questionCreatePlacement: undefined,
    }),
  setSelectedQuestionId: (questionId) =>
    set({
      selectedQuestionId: questionId,
      questionCreatePlacement: undefined,
    }),
  startQuestionCreate: (sectionId, afterQuestionId) =>
    set({
      selectedSectionId: sectionId,
      selectedQuestionId: undefined,
      questionCreatePlacement: { sectionId, afterQuestionId },
    }),
  clearQuestionCreate: () => set({ questionCreatePlacement: undefined }),
  setLeftPanelOpen: (isOpen) => set({ isLeftPanelOpen: isOpen }),
  resetBuilderSelection: () =>
    set({
      selectedSurveyId: undefined,
      selectedSectionId: undefined,
      selectedQuestionId: undefined,
      questionCreatePlacement: undefined,
      isLeftPanelOpen: true,
    }),
}));
