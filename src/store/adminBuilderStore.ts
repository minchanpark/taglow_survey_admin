import { create } from "zustand";

type AdminBuilderState = Readonly<{
  selectedSurveyId?: string;
  selectedSectionId?: string;
  selectedQuestionId?: string;
  isLeftPanelOpen: boolean;
  setSelectedSurveyId: (surveyId: string | undefined) => void;
  setSelectedSectionId: (sectionId: string | undefined) => void;
  setSelectedQuestionId: (questionId: string | undefined) => void;
  setLeftPanelOpen: (isOpen: boolean) => void;
  resetBuilderSelection: () => void;
}>;

export const useAdminBuilderStore = create<AdminBuilderState>((set) => ({
  selectedSurveyId: undefined,
  selectedSectionId: undefined,
  selectedQuestionId: undefined,
  isLeftPanelOpen: true,
  setSelectedSurveyId: (surveyId) =>
    set((state) => ({
      selectedSurveyId: surveyId,
      selectedSectionId: surveyId === state.selectedSurveyId ? state.selectedSectionId : undefined,
      selectedQuestionId: surveyId === state.selectedSurveyId ? state.selectedQuestionId : undefined,
    })),
  setSelectedSectionId: (sectionId) =>
    set({
      selectedSectionId: sectionId,
      selectedQuestionId: undefined,
    }),
  setSelectedQuestionId: (questionId) => set({ selectedQuestionId: questionId }),
  setLeftPanelOpen: (isOpen) => set({ isLeftPanelOpen: isOpen }),
  resetBuilderSelection: () =>
    set({
      selectedSurveyId: undefined,
      selectedSectionId: undefined,
      selectedQuestionId: undefined,
      isLeftPanelOpen: true,
    }),
}));
