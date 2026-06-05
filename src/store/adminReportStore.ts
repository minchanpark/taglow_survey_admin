import { create } from "zustand";
import type { ReportMetadata, ReportNarrativeResult, ReportNarrativeBlockResult } from "../api/admin/model";

export type ReportSectionKey =
  | "overview"
  | "response_profile"
  | "priority"
  | "section_summary"
  | "question_summary"
  | "choice_distribution"
  | "text_evidence"
  | "recommendation"
  | "appendix";

type AdminReportState = Readonly<{
  surveyId?: string;
  metadata: ReportMetadata;
  includedSections: Record<ReportSectionKey, boolean>;
  editedSummaries: Record<string, string>;
  narrativeBlocks: Record<string, ReportNarrativeBlockResult>;
  useSampleData: boolean;
  setSurveyId: (surveyId: string | undefined, defaultTitle?: string) => void;
  updateMetadata: (metadata: Partial<ReportMetadata>) => void;
  toggleSection: (section: ReportSectionKey) => void;
  setBlockSummary: (blockId: string, summary: string) => void;
  applyNarrativeResult: (result: ReportNarrativeResult) => void;
  setUseSampleData: (useSampleData: boolean) => void;
  resetReport: (defaultTitle?: string) => void;
}>;

const includedSections: Record<ReportSectionKey, boolean> = {
  overview: true,
  response_profile: true,
  priority: true,
  section_summary: true,
  question_summary: true,
  choice_distribution: true,
  text_evidence: true,
  recommendation: true,
  appendix: true,
};

function createDefaultMetadata(defaultTitle = "설문 분석 보고서"): ReportMetadata {
  return {
    title: defaultTitle,
    term: "",
    reportDate: new Date().toISOString().slice(0, 10),
    author: "",
    surveyPeriod: "",
    audience: "",
    method: "온라인 설문",
    purpose: "응답 결과를 바탕으로 개선 우선순위와 근거를 정리합니다.",
  };
}

export const useAdminReportStore = create<AdminReportState>((set) => ({
  surveyId: undefined,
  metadata: createDefaultMetadata(),
  includedSections,
  editedSummaries: {},
  narrativeBlocks: {},
  useSampleData: false,
  setSurveyId: (surveyId, defaultTitle) =>
    set((state) => {
      if (surveyId === state.surveyId) {
        if (defaultTitle && state.metadata.title === "설문 분석 보고서") {
          return { metadata: { ...state.metadata, title: defaultTitle } };
        }
        return state;
      }
      return {
        surveyId,
        metadata: createDefaultMetadata(defaultTitle),
        includedSections,
        editedSummaries: {},
        narrativeBlocks: {},
        useSampleData: false,
      };
    }),
  updateMetadata: (metadata) => set((state) => ({ metadata: { ...state.metadata, ...metadata } })),
  toggleSection: (section) =>
    set((state) => ({
      includedSections: { ...state.includedSections, [section]: !state.includedSections[section] },
    })),
  setBlockSummary: (blockId, summary) =>
    set((state) => ({
      editedSummaries: { ...state.editedSummaries, [blockId]: summary },
    })),
  applyNarrativeResult: (result) =>
    set((state) => {
      const editedSummaries = { ...state.editedSummaries };
      const narrativeBlocks = { ...state.narrativeBlocks };
      result.blocks.forEach((block) => {
        editedSummaries[block.blockId] = block.summary;
        narrativeBlocks[block.blockId] = block;
      });
      return { editedSummaries, narrativeBlocks };
    }),
  setUseSampleData: (useSampleData) => set({ useSampleData: import.meta.env.DEV ? useSampleData : false }),
  resetReport: (defaultTitle) =>
    set({
      metadata: createDefaultMetadata(defaultTitle),
      includedSections,
      editedSummaries: {},
      narrativeBlocks: {},
      useSampleData: false,
    }),
}));
