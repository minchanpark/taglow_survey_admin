import type { ParticipantSurveyDetail } from "../model";

export interface ParticipantSurveyController {
  getPublishedSurveyByIdentifier(publicIdentifier: string): Promise<ParticipantSurveyDetail>;
}
