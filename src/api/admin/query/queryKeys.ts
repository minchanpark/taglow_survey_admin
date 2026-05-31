import type { AnalysisFilters, GroupCompareFilters, HeatmapFilters, PreviewOptions, TextAnswerFilters } from "../model";

export const adminQueryKeys = {
  adminSession: ["admin", "session"] as const,
  currentAdmin: ["admin", "currentAdmin"] as const,
  pendingAdminMembers: ["admin", "adminMembers", "pending"] as const,
  activeAdminMembers: ["admin", "adminMembers", "active"] as const,
  surveys: ["admin", "surveys"] as const,
  survey: (surveyId: string) => ["admin", "survey", surveyId] as const,
  surveyCollaborators: (surveyId: string) => ["admin", "survey", surveyId, "collaborators"] as const,
  sections: (surveyId: string) => ["admin", "survey", surveyId, "sections"] as const,
  questions: (surveyId: string) => ["admin", "survey", surveyId, "questions"] as const,
  assets: (surveyId: string) => ["admin", "survey", surveyId, "assets"] as const,
  questionSetImportPreview: (surveyId: string, templateId: string) =>
    ["admin", "survey", surveyId, "questionSetImportPreview", templateId] as const,
  previewRoot: (surveyId: string) => ["admin", "survey", surveyId, "preview"] as const,
  preview: (surveyId: string, options: PreviewOptions) => ["admin", "survey", surveyId, "preview", options] as const,
  filterOptions: (surveyId: string) => ["admin", "survey", surveyId, "filterOptions"] as const,
  analysisRoot: (surveyId: string) => ["admin", "survey", surveyId, "analysis"] as const,
  responseSummary: (surveyId: string, filters: AnalysisFilters) =>
    ["admin", "survey", surveyId, "analysis", "responseSummary", filters] as const,
  sectionSummary: (surveyId: string, filters: AnalysisFilters) =>
    ["admin", "survey", surveyId, "analysis", "sectionSummary", filters] as const,
  questionSummary: (surveyId: string, filters: AnalysisFilters) =>
    ["admin", "survey", surveyId, "analysis", "questionSummary", filters] as const,
  choiceDistribution: (surveyId: string, filters: AnalysisFilters) =>
    ["admin", "survey", surveyId, "analysis", "choiceDistribution", filters] as const,
  groupCompare: (surveyId: string, filters: GroupCompareFilters) =>
    ["admin", "survey", surveyId, "analysis", "groupCompare", filters] as const,
  priorityTop5: (surveyId: string, filters: AnalysisFilters) =>
    ["admin", "survey", surveyId, "analysis", "priorityTop5", filters] as const,
  borich: (surveyId: string, filters: AnalysisFilters) =>
    ["admin", "survey", surveyId, "analysis", "borich", filters] as const,
  locus: (surveyId: string, filters: AnalysisFilters) =>
    ["admin", "survey", surveyId, "analysis", "locus", filters] as const,
  heatmap: (surveyId: string, filters: HeatmapFilters) =>
    ["admin", "survey", surveyId, "analysis", "heatmap", filters] as const,
  imageTagAnswers: (surveyId: string, filters: HeatmapFilters) =>
    ["admin", "survey", surveyId, "analysis", "imageTagAnswers", filters] as const,
  textAnswers: (surveyId: string, filters: TextAnswerFilters) =>
    ["admin", "survey", surveyId, "analysis", "textAnswers", filters] as const,
  textGroups: (surveyId: string, filters: TextAnswerFilters) =>
    ["admin", "survey", surveyId, "analysis", "textGroups", filters] as const,
};
