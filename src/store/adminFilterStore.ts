import { create } from "zustand";
import type { AnalysisFilters } from "../api/admin/model";

type AdminFilterState = Readonly<{
  surveyId?: string;
  filters: AnalysisFilters;
  activeTab: "overview" | "groups" | "borich" | "heatmap" | "text";
  setSurveyId: (surveyId: string | undefined) => void;
  setFilters: (filters: AnalysisFilters) => void;
  setActiveTab: (tab: AdminFilterState["activeTab"]) => void;
  resetFilters: () => void;
}>;

const emptyFilters: AnalysisFilters = {};

export const useAdminFilterStore = create<AdminFilterState>((set) => ({
  surveyId: undefined,
  filters: emptyFilters,
  activeTab: "overview",
  setSurveyId: (surveyId) =>
    set((state) => ({
      surveyId,
      filters: surveyId === state.surveyId ? state.filters : emptyFilters,
      activeTab: surveyId === state.surveyId ? state.activeTab : "overview",
    })),
  setFilters: (filters) => set({ filters }),
  setActiveTab: (activeTab) => set({ activeTab }),
  resetFilters: () => set({ filters: emptyFilters, activeTab: "overview" }),
}));
