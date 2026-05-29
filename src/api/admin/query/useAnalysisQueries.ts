import { useQuery } from "@tanstack/react-query";
import { useAdminApiController } from "../controller/adminApiControllerProvider";
import type { AnalysisFilters, HeatmapFilters, TextAnswerFilters } from "../model";
import { adminQueryKeys } from "./queryKeys";

export function useFilterOptionsQuery(surveyId: string) {
  const controller = useAdminApiController();
  return useQuery({
    queryKey: adminQueryKeys.filterOptions(surveyId),
    queryFn: () => controller.getFilterOptions(surveyId),
    enabled: Boolean(surveyId),
  });
}

export function useSectionSatisfactionSummaryQuery(surveyId: string, filters: AnalysisFilters) {
  const controller = useAdminApiController();
  return useQuery({
    queryKey: adminQueryKeys.sectionSummary(surveyId, filters),
    queryFn: () => controller.getSectionSatisfactionSummary({ surveyId, filters }),
    enabled: Boolean(surveyId),
  });
}

export function useBorichSummaryQuery(surveyId: string, filters: AnalysisFilters) {
  const controller = useAdminApiController();
  return useQuery({
    queryKey: adminQueryKeys.borich(surveyId, filters),
    queryFn: () => controller.getBorichSummary({ surveyId, filters }),
    enabled: Boolean(surveyId),
  });
}

export function useHeatmapPointsQuery(surveyId: string, filters: HeatmapFilters) {
  const controller = useAdminApiController();
  return useQuery({
    queryKey: adminQueryKeys.heatmap(surveyId, filters),
    queryFn: () => controller.getHeatmapPoints({ surveyId, filters }),
    enabled: Boolean(surveyId),
  });
}

export function useImageTagAnswersQuery(surveyId: string, filters: HeatmapFilters) {
  const controller = useAdminApiController();
  return useQuery({
    queryKey: adminQueryKeys.imageTagAnswers(surveyId, filters),
    queryFn: () => controller.listImageTagAnswers({ surveyId, filters }),
    enabled: Boolean(surveyId),
  });
}

export function useTextAnswersQuery(surveyId: string, filters: TextAnswerFilters) {
  const controller = useAdminApiController();
  return useQuery({
    queryKey: adminQueryKeys.textAnswers(surveyId, filters),
    queryFn: () => controller.listTextAnswers({ surveyId, filters }),
    enabled: Boolean(surveyId),
  });
}
