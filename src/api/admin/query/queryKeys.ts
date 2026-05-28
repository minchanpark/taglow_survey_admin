import type { AnalysisFilters, HeatmapFilters, PreviewOptions, TextAnswerFilters } from "../model";

export const adminQueryKeys = {
  adminSession: ["admin", "session"] as const,
  currentAdmin: ["admin", "currentAdmin"] as const,
  surveys: ["admin", "surveys"] as const,
  survey: (surveyId: string) => ["admin", "survey", surveyId] as const,
  sections: (surveyId: string) => ["admin", "survey", surveyId, "sections"] as const,
  questions: (surveyId: string) => ["admin", "survey", surveyId, "questions"] as const,
  assets: (surveyId: string) => ["admin", "survey", surveyId, "assets"] as const,
  questionSetImportPreview: (surveyId: string, templateId: string) =>
    ["admin", "survey", surveyId, "questionSetImportPreview", templateId] as const,
  previewRoot: (surveyId: string) => ["admin", "survey", surveyId, "preview"] as const,
  preview: (surveyId: string, options: PreviewOptions) => ["admin", "survey", surveyId, "preview", options] as const,
  filterOptions: (surveyId: string) => ["admin", "survey", surveyId, "filterOptions"] as const,
  sectionSummary: (surveyId: string, filters: AnalysisFilters) =>
    ["admin", "survey", surveyId, "analysis", "sectionSummary", filters] as const,
  borich: (surveyId: string, filters: AnalysisFilters) =>
    ["admin", "survey", surveyId, "analysis", "borich", filters] as const,
  heatmap: (surveyId: string, filters: HeatmapFilters) =>
    ["admin", "survey", surveyId, "analysis", "heatmap", filters] as const,
  textAnswers: (surveyId: string, filters: TextAnswerFilters) =>
    ["admin", "survey", surveyId, "analysis", "textAnswers", filters] as const,
};
