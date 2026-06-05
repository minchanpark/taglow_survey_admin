import { useMutation, useQuery } from "@tanstack/react-query";
import { useParticipantSurveyController } from "../controller";
import type { ParticipantQuestionImageUploadCommand, ParticipantSignInCommand, SubmitSurveyResponseCommand } from "../model";
import { participantSurveyQueryKeys } from "./queryKeys";

export function useParticipantSessionQuery() {
  const controller = useParticipantSurveyController();
  return useQuery({
    queryKey: participantSurveyQueryKeys.session,
    queryFn: () => controller.getParticipantSessionState(),
  });
}

export function useParticipantGoogleSignInMutation() {
  const controller = useParticipantSurveyController();
  return useMutation({
    mutationFn: (command: ParticipantSignInCommand) => controller.signInWithGoogle(command),
  });
}

export function useParticipantLoginContentQuery(publicIdentifier: string) {
  const controller = useParticipantSurveyController();
  return useQuery({
    queryKey: participantSurveyQueryKeys.loginContent(publicIdentifier),
    queryFn: () => controller.getParticipantLoginContent(publicIdentifier),
    enabled: Boolean(publicIdentifier),
    staleTime: 5 * 60 * 1000,
  });
}

export function useParticipantSurveyQuery(publicIdentifier: string, enabled = true) {
  const controller = useParticipantSurveyController();
  return useQuery({
    queryKey: participantSurveyQueryKeys.survey(publicIdentifier),
    queryFn: () => controller.getPublishedSurveyByIdentifier(publicIdentifier),
    enabled: Boolean(publicIdentifier) && enabled,
  });
}

export function useParticipantQuestionImageUploadMutation() {
  const controller = useParticipantSurveyController();
  return useMutation({
    mutationFn: (command: ParticipantQuestionImageUploadCommand) => controller.uploadQuestionImage(command),
  });
}

export function useSubmitSurveyResponseMutation() {
  const controller = useParticipantSurveyController();
  return useMutation({
    mutationFn: (command: SubmitSurveyResponseCommand) => controller.submitSurveyResponse(command),
  });
}
