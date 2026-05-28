import type { ParticipantQuestionImageUpload, ParticipantQuestionImageUploadCommand, ParticipantSurveyDetail } from "../model";

export interface ParticipantSurveyController {
  getPublishedSurveyByIdentifier(publicIdentifier: string): Promise<ParticipantSurveyDetail>;
  uploadQuestionImage(command: ParticipantQuestionImageUploadCommand): Promise<ParticipantQuestionImageUpload>;
}
