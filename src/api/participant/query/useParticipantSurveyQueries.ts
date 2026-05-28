import { useMutation, useQuery } from "@tanstack/react-query";
import { useParticipantSurveyController } from "../controller";
import type { ParticipantQuestionImageUploadCommand } from "../model";
import { participantSurveyQueryKeys } from "./queryKeys";

export function useParticipantSurveyQuery(publicIdentifier: string) {
  const controller = useParticipantSurveyController();
  return useQuery({
    queryKey: participantSurveyQueryKeys.survey(publicIdentifier),
    queryFn: () => controller.getPublishedSurveyByIdentifier(publicIdentifier),
    enabled: Boolean(publicIdentifier),
  });
}

export function useParticipantQuestionImageUploadMutation() {
  const controller = useParticipantSurveyController();
  return useMutation({
    mutationFn: (command: ParticipantQuestionImageUploadCommand) => controller.uploadQuestionImage(command),
  });
}
