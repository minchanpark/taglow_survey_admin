import { useQuery } from "@tanstack/react-query";
import { useAdminApiController } from "../controller/adminApiControllerProvider";
import type { AnalysisFilters, GroupCompareFilters, HeatmapFilters, TextAnswerFilters } from "../model";
import { adminQueryKeys } from "./queryKeys";

type AnalysisQueryOptions = Readonly<{
  enabled?: boolean;
}>;

export function useFilterOptionsQuery(surveyId: string) {
  const controller = useAdminApiController();
  return useQuery({
    queryKey: adminQueryKeys.filterOptions(surveyId),
    queryFn: () => controller.getFilterOptions(surveyId),
    enabled: Boolean(surveyId),
  });
}

export function useSectionSatisfactionSummaryQuery(surveyId: string, filters: AnalysisFilters, options: AnalysisQueryOptions = {}) {
  const controller = useAdminApiController();
  return useQuery({
    queryKey: adminQueryKeys.sectionSummary(surveyId, filters),
    queryFn: () => controller.getSectionSatisfactionSummary({ surveyId, filters }),
    enabled: Boolean(surveyId) && (options.enabled ?? true),
  });
}

export function useResponseSummaryQuery(surveyId: string, filters: AnalysisFilters, options: AnalysisQueryOptions = {}) {
  const controller = useAdminApiController();
  return useQuery({
    queryKey: adminQueryKeys.responseSummary(surveyId, filters),
    queryFn: () => controller.getResponseSummary({ surveyId, filters }),
    enabled: Boolean(surveyId) && (options.enabled ?? true),
  });
}

export function useQuestionSatisfactionSummaryQuery(surveyId: string, filters: AnalysisFilters, options: AnalysisQueryOptions = {}) {
  const controller = useAdminApiController();
  return useQuery({
    queryKey: adminQueryKeys.questionSummary(surveyId, filters),
    queryFn: () => controller.getQuestionSatisfactionSummary({ surveyId, filters }),
    enabled: Boolean(surveyId) && (options.enabled ?? true),
  });
}

export function useChoiceDistributionQuery(surveyId: string, filters: AnalysisFilters, options: AnalysisQueryOptions = {}) {
  const controller = useAdminApiController();
  return useQuery({
    queryKey: adminQueryKeys.choiceDistribution(surveyId, filters),
    queryFn: () => controller.getChoiceDistribution({ surveyId, filters }),
    enabled: Boolean(surveyId) && (options.enabled ?? true),
  });
}

export function useGroupCompareSummaryQuery(surveyId: string, filters: GroupCompareFilters, options: AnalysisQueryOptions = {}) {
  const controller = useAdminApiController();
  return useQuery({
    queryKey: adminQueryKeys.groupCompare(surveyId, filters),
    queryFn: () => controller.getGroupCompareSummary({ surveyId, filters }),
    enabled: Boolean(surveyId) && (options.enabled ?? true),
  });
}

export function usePriorityTop5Query(surveyId: string, filters: AnalysisFilters, options: AnalysisQueryOptions = {}) {
  const controller = useAdminApiController();
  return useQuery({
    queryKey: adminQueryKeys.priorityTop5(surveyId, filters),
    queryFn: () => controller.getPriorityTop5({ surveyId, filters }),
    enabled: Boolean(surveyId) && (options.enabled ?? true),
  });
}

export function useBorichSummaryQuery(surveyId: string, filters: AnalysisFilters, options: AnalysisQueryOptions = {}) {
  const controller = useAdminApiController();
  return useQuery({
    queryKey: adminQueryKeys.borich(surveyId, filters),
    queryFn: () => controller.getBorichSummary({ surveyId, filters }),
    enabled: Boolean(surveyId) && (options.enabled ?? true),
  });
}

export function useLocusSummaryQuery(surveyId: string, filters: AnalysisFilters, options: AnalysisQueryOptions = {}) {
  const controller = useAdminApiController();
  return useQuery({
    queryKey: adminQueryKeys.locus(surveyId, filters),
    queryFn: () => controller.getLocusSummary({ surveyId, filters }),
    enabled: Boolean(surveyId) && (options.enabled ?? true),
  });
}

export function useHeatmapPointsQuery(surveyId: string, filters: HeatmapFilters, options: AnalysisQueryOptions = {}) {
  const controller = useAdminApiController();
  return useQuery({
    queryKey: adminQueryKeys.heatmap(surveyId, filters),
    queryFn: () => controller.getHeatmapPoints({ surveyId, filters }),
    enabled: Boolean(surveyId) && (options.enabled ?? true),
  });
}

export function useImageTagAnswersQuery(surveyId: string, filters: HeatmapFilters, options: AnalysisQueryOptions = {}) {
  const controller = useAdminApiController();
  return useQuery({
    queryKey: adminQueryKeys.imageTagAnswers(surveyId, filters),
    queryFn: () => controller.listImageTagAnswers({ surveyId, filters }),
    enabled: Boolean(surveyId) && (options.enabled ?? true),
  });
}

export function useTextAnswersQuery(surveyId: string, filters: TextAnswerFilters, options: AnalysisQueryOptions = {}) {
  const controller = useAdminApiController();
  return useQuery({
    queryKey: adminQueryKeys.textAnswers(surveyId, filters),
    queryFn: () => controller.listTextAnswers({ surveyId, filters }),
    enabled: Boolean(surveyId) && (options.enabled ?? true),
  });
}

export function useTextGroupsQuery(surveyId: string, filters: TextAnswerFilters, options: AnalysisQueryOptions = {}) {
  const controller = useAdminApiController();
  return useQuery({
    queryKey: adminQueryKeys.textGroups(surveyId, filters),
    queryFn: () => controller.getTextGroups({ surveyId, filters }),
    enabled: Boolean(surveyId) && (options.enabled ?? true),
  });
}
