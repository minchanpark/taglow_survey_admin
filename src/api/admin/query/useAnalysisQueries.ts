import { useInfiniteQuery, useMutation, useQuery } from "@tanstack/react-query";
import { useAdminApiController } from "../controller/adminApiControllerProvider";
import type {
  AnalysisFilters,
  GroupCompareFilters,
  HeatmapFilters,
  IdentityResponse,
  IdentityResponseFilterCommand,
  IdentityResponseFilters,
  IndividualResponseFilters,
  TextAnswer,
  TextAnswerFilterCommand,
  TextAnswerFilters,
} from "../model";
import { adminQueryKeys } from "./queryKeys";

type AnalysisQueryOptions = Readonly<{
  enabled?: boolean;
}>;

const analysisStaleTimeMs = 60_000;
const identityResponseExportPageSize = 200;
const identityResponseExportMaxPages = 500;
const textAnswerExportPageSize = 100;
const textAnswerExportMaxPages = 500;

export function useFilterOptionsQuery(surveyId: string) {
  const controller = useAdminApiController();
  return useQuery({
    queryKey: adminQueryKeys.filterOptions(surveyId),
    queryFn: () => controller.getFilterOptions(surveyId),
    enabled: Boolean(surveyId),
    staleTime: analysisStaleTimeMs,
  });
}

export function useSectionSatisfactionSummaryQuery(surveyId: string, filters: AnalysisFilters, options: AnalysisQueryOptions = {}) {
  const controller = useAdminApiController();
  return useQuery({
    queryKey: adminQueryKeys.sectionSummary(surveyId, filters),
    queryFn: () => controller.getSectionSatisfactionSummary({ surveyId, filters }),
    enabled: Boolean(surveyId) && (options.enabled ?? true),
    staleTime: analysisStaleTimeMs,
  });
}

export function useResponseSummaryQuery(surveyId: string, filters: AnalysisFilters, options: AnalysisQueryOptions = {}) {
  const controller = useAdminApiController();
  return useQuery({
    queryKey: adminQueryKeys.responseSummary(surveyId, filters),
    queryFn: () => controller.getResponseSummary({ surveyId, filters }),
    enabled: Boolean(surveyId) && (options.enabled ?? true),
    staleTime: analysisStaleTimeMs,
  });
}

export function useQuestionSatisfactionSummaryQuery(surveyId: string, filters: AnalysisFilters, options: AnalysisQueryOptions = {}) {
  const controller = useAdminApiController();
  return useQuery({
    queryKey: adminQueryKeys.questionSummary(surveyId, filters),
    queryFn: () => controller.getQuestionSatisfactionSummary({ surveyId, filters }),
    enabled: Boolean(surveyId) && (options.enabled ?? true),
    staleTime: analysisStaleTimeMs,
  });
}

export function useChoiceDistributionQuery(surveyId: string, filters: AnalysisFilters, options: AnalysisQueryOptions = {}) {
  const controller = useAdminApiController();
  return useQuery({
    queryKey: adminQueryKeys.choiceDistribution(surveyId, filters),
    queryFn: () => controller.getChoiceDistribution({ surveyId, filters }),
    enabled: Boolean(surveyId) && (options.enabled ?? true),
    staleTime: analysisStaleTimeMs,
  });
}

export function useGroupCompareSummaryQuery(surveyId: string, filters: GroupCompareFilters, options: AnalysisQueryOptions = {}) {
  const controller = useAdminApiController();
  return useQuery({
    queryKey: adminQueryKeys.groupCompare(surveyId, filters),
    queryFn: () => controller.getGroupCompareSummary({ surveyId, filters }),
    enabled: Boolean(surveyId) && (options.enabled ?? true),
    staleTime: analysisStaleTimeMs,
  });
}

export function usePriorityTop5Query(surveyId: string, filters: AnalysisFilters, options: AnalysisQueryOptions = {}) {
  const controller = useAdminApiController();
  return useQuery({
    queryKey: adminQueryKeys.priorityTop5(surveyId, filters),
    queryFn: () => controller.getPriorityTop5({ surveyId, filters }),
    enabled: Boolean(surveyId) && (options.enabled ?? true),
    staleTime: analysisStaleTimeMs,
  });
}

export function useBorichSummaryQuery(surveyId: string, filters: AnalysisFilters, options: AnalysisQueryOptions = {}) {
  const controller = useAdminApiController();
  return useQuery({
    queryKey: adminQueryKeys.borich(surveyId, filters),
    queryFn: () => controller.getBorichSummary({ surveyId, filters }),
    enabled: Boolean(surveyId) && (options.enabled ?? true),
    staleTime: analysisStaleTimeMs,
  });
}

export function useLocusSummaryQuery(surveyId: string, filters: AnalysisFilters, options: AnalysisQueryOptions = {}) {
  const controller = useAdminApiController();
  return useQuery({
    queryKey: adminQueryKeys.locus(surveyId, filters),
    queryFn: () => controller.getLocusSummary({ surveyId, filters }),
    enabled: Boolean(surveyId) && (options.enabled ?? true),
    staleTime: analysisStaleTimeMs,
  });
}

export function useHeatmapPointsQuery(surveyId: string, filters: HeatmapFilters, options: AnalysisQueryOptions = {}) {
  const controller = useAdminApiController();
  return useQuery({
    queryKey: adminQueryKeys.heatmap(surveyId, filters),
    queryFn: () => controller.getHeatmapPoints({ surveyId, filters }),
    enabled: Boolean(surveyId) && (options.enabled ?? true),
    staleTime: analysisStaleTimeMs,
  });
}

export function useImageTagAnswersQuery(surveyId: string, filters: HeatmapFilters, options: AnalysisQueryOptions = {}) {
  const controller = useAdminApiController();
  return useQuery({
    queryKey: adminQueryKeys.imageTagAnswers(surveyId, filters),
    queryFn: () => controller.listImageTagAnswers({ surveyId, filters }).then((page) => page.items),
    enabled: Boolean(surveyId) && (options.enabled ?? true),
    staleTime: analysisStaleTimeMs,
  });
}

export function useImageTagAnswersInfiniteQuery(surveyId: string, filters: HeatmapFilters, options: AnalysisQueryOptions = {}) {
  const controller = useAdminApiController();
  return useInfiniteQuery({
    queryKey: adminQueryKeys.imageTagAnswersInfinite(surveyId, filters),
    queryFn: ({ pageParam }) => controller.listImageTagAnswers({ surveyId, filters: { ...filters, cursor: pageParam, limit: filters.limit ?? 50 } }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: Boolean(surveyId) && (options.enabled ?? true),
    staleTime: analysisStaleTimeMs,
  });
}

export function useIdentityResponsesInfiniteQuery(surveyId: string, filters: IdentityResponseFilters, options: AnalysisQueryOptions = {}) {
  const controller = useAdminApiController();
  return useInfiniteQuery({
    queryKey: adminQueryKeys.identityResponsesInfinite(surveyId, filters),
    queryFn: ({ pageParam }) => controller.listIdentityResponses({ surveyId, filters: { ...filters, cursor: pageParam, limit: filters.limit ?? 100 } }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: Boolean(surveyId) && (options.enabled ?? true),
    staleTime: analysisStaleTimeMs,
  });
}

export function useIndividualResponsesInfiniteQuery(surveyId: string, filters: IndividualResponseFilters, options: AnalysisQueryOptions = {}) {
  const controller = useAdminApiController();
  return useInfiniteQuery({
    queryKey: adminQueryKeys.individualResponsesInfinite(surveyId, filters),
    queryFn: ({ pageParam }) => controller.listIndividualResponses({ surveyId, filters: { ...filters, cursor: pageParam, limit: filters.limit ?? 1 } }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: Boolean(surveyId) && (options.enabled ?? true),
    staleTime: analysisStaleTimeMs,
  });
}

export function useIdentityResponsesExportMutation() {
  const controller = useAdminApiController();
  return useMutation({
    mutationFn: async (command: IdentityResponseFilterCommand): Promise<IdentityResponse[]> => {
      const items: IdentityResponse[] = [];
      const seenCursors = new Set<string>();
      let cursor: string | undefined;

      for (let pageIndex = 0; pageIndex < identityResponseExportMaxPages; pageIndex += 1) {
        const page = await controller.listIdentityResponses({
          surveyId: command.surveyId,
          filters: { ...command.filters, cursor, limit: identityResponseExportPageSize },
        });
        items.push(...page.items);
        if (!page.nextCursor || seenCursors.has(page.nextCursor)) break;
        seenCursors.add(page.nextCursor);
        cursor = page.nextCursor;
      }

      return items;
    },
  });
}

export function useTextAnswersQuery(surveyId: string, filters: TextAnswerFilters, options: AnalysisQueryOptions = {}) {
  const controller = useAdminApiController();
  return useQuery({
    queryKey: adminQueryKeys.textAnswers(surveyId, filters),
    queryFn: () => controller.listTextAnswers({ surveyId, filters }).then((page) => page.items),
    enabled: Boolean(surveyId) && (options.enabled ?? true),
    staleTime: analysisStaleTimeMs,
  });
}

export function useTextAnswersInfiniteQuery(surveyId: string, filters: TextAnswerFilters, options: AnalysisQueryOptions = {}) {
  const controller = useAdminApiController();
  return useInfiniteQuery({
    queryKey: adminQueryKeys.textAnswersInfinite(surveyId, filters),
    queryFn: ({ pageParam }) => controller.listTextAnswers({ surveyId, filters: { ...filters, cursor: pageParam, limit: filters.limit ?? 50 } }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: Boolean(surveyId) && (options.enabled ?? true),
    staleTime: analysisStaleTimeMs,
  });
}

export function useTextAnswersExportMutation() {
  const controller = useAdminApiController();
  return useMutation({
    mutationFn: async (command: TextAnswerFilterCommand): Promise<TextAnswer[]> => {
      const items: TextAnswer[] = [];
      const seenCursors = new Set<string>();
      let cursor: string | undefined;

      for (let pageIndex = 0; pageIndex < textAnswerExportMaxPages; pageIndex += 1) {
        const page = await controller.listTextAnswers({
          surveyId: command.surveyId,
          filters: { ...command.filters, cursor, limit: textAnswerExportPageSize },
        });
        items.push(...page.items);
        if (!page.nextCursor || seenCursors.has(page.nextCursor)) break;
        seenCursors.add(page.nextCursor);
        cursor = page.nextCursor;
      }

      return items;
    },
  });
}

export function useTextGroupsQuery(surveyId: string, filters: TextAnswerFilters, options: AnalysisQueryOptions = {}) {
  const controller = useAdminApiController();
  return useQuery({
    queryKey: adminQueryKeys.textGroups(surveyId, filters),
    queryFn: () => controller.getTextGroups({ surveyId, filters }),
    enabled: Boolean(surveyId) && (options.enabled ?? true),
    staleTime: analysisStaleTimeMs,
  });
}
