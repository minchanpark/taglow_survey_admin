import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAdminApiController } from "../controller/adminApiControllerProvider";
import type { CreateSurveyCommand, UpdateSurveyCommand } from "../model";
import { adminQueryKeys } from "./queryKeys";

export function useSurveysQuery() {
  const controller = useAdminApiController();
  return useQuery({
    queryKey: adminQueryKeys.surveys,
    queryFn: () => controller.listSurveys(),
  });
}

export function useSurveyDetailQuery(surveyId: string) {
  const controller = useAdminApiController();
  return useQuery({
    queryKey: adminQueryKeys.survey(surveyId),
    queryFn: () => controller.getSurveyDetail(surveyId),
    enabled: Boolean(surveyId),
  });
}

export function useCreateSurveyMutation() {
  const controller = useAdminApiController();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (command: CreateSurveyCommand) => controller.createSurvey(command),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminQueryKeys.surveys });
    },
  });
}

export function useUpdateSurveyMutation() {
  const controller = useAdminApiController();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (command: UpdateSurveyCommand) => controller.updateSurvey(command),
    onSuccess: (survey) => {
      void queryClient.invalidateQueries({ queryKey: adminQueryKeys.surveys });
      void queryClient.invalidateQueries({ queryKey: adminQueryKeys.survey(survey.id) });
    },
  });
}

export function useArchiveSurveyMutation() {
  const controller = useAdminApiController();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (surveyId: string) => controller.archiveSurvey(surveyId),
    onSuccess: (survey) => {
      void queryClient.invalidateQueries({ queryKey: adminQueryKeys.surveys });
      void queryClient.invalidateQueries({ queryKey: adminQueryKeys.survey(survey.id) });
    },
  });
}

export function useDeleteSurveyMutation() {
  const controller = useAdminApiController();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (surveyId: string) => controller.deleteSurvey(surveyId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminQueryKeys.surveys });
    },
  });
}

export const useDeleteDraftSurveyMutation = useDeleteSurveyMutation;
