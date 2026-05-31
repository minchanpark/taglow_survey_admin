import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAdminApiController } from "../controller/adminApiControllerProvider";
import type {
  CreateSurveyCommand,
  InviteSurveyCollaboratorCommand,
  RevokeSurveyCollaboratorCommand,
  UpdateSurveyCollaboratorRoleCommand,
  UpdateSurveyCommand,
} from "../model";
import { adminQueryKeys } from "./queryKeys";

export function useSurveysQuery() {
  const controller = useAdminApiController();
  return useQuery({
    queryKey: adminQueryKeys.surveys,
    queryFn: () => controller.listSurveys(),
  });
}

export function useSurveyDetailQuery(surveyId: string, enabled = true) {
  const controller = useAdminApiController();
  return useQuery({
    queryKey: adminQueryKeys.survey(surveyId),
    queryFn: () => controller.getSurveyDetail(surveyId),
    enabled: Boolean(surveyId) && enabled,
  });
}

export function useSurveyCollaboratorsQuery(surveyId: string, enabled = true) {
  const controller = useAdminApiController();
  return useQuery({
    queryKey: adminQueryKeys.surveyCollaborators(surveyId),
    queryFn: () => controller.listSurveyCollaborators(surveyId),
    enabled: Boolean(surveyId) && enabled,
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

export function useInviteSurveyCollaboratorMutation() {
  const controller = useAdminApiController();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (command: InviteSurveyCollaboratorCommand) => controller.inviteSurveyCollaborator(command),
    onSuccess: (collaborator) => {
      void queryClient.invalidateQueries({ queryKey: adminQueryKeys.surveyCollaborators(collaborator.surveyId) });
      void queryClient.invalidateQueries({ queryKey: adminQueryKeys.surveys });
    },
  });
}

export function useUpdateSurveyCollaboratorRoleMutation() {
  const controller = useAdminApiController();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (command: UpdateSurveyCollaboratorRoleCommand) => controller.updateSurveyCollaboratorRole(command),
    onSuccess: (collaborator) => {
      void queryClient.invalidateQueries({ queryKey: adminQueryKeys.surveyCollaborators(collaborator.surveyId) });
    },
  });
}

export function useRevokeSurveyCollaboratorMutation() {
  const controller = useAdminApiController();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (command: RevokeSurveyCollaboratorCommand) => controller.revokeSurveyCollaborator(command),
    onSuccess: (collaborator) => {
      void queryClient.invalidateQueries({ queryKey: adminQueryKeys.surveyCollaborators(collaborator.surveyId) });
      void queryClient.invalidateQueries({ queryKey: adminQueryKeys.surveys });
    },
  });
}
