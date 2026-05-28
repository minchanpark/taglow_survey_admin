import { useQuery } from "@tanstack/react-query";
import { useParticipantSurveyController } from "../controller";
import { participantSurveyQueryKeys } from "./queryKeys";

export function useParticipantSurveyQuery(publicIdentifier: string) {
  const controller = useParticipantSurveyController();
  return useQuery({
    queryKey: participantSurveyQueryKeys.survey(publicIdentifier),
    queryFn: () => controller.getPublishedSurveyByIdentifier(publicIdentifier),
    enabled: Boolean(publicIdentifier),
  });
}
