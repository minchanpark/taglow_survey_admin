import type {
  ParticipantQuestionImageUpload,
  ParticipantQuestionImageUploadCommand,
  ParticipantSessionState,
  ParticipantSignInCommand,
  ParticipantSurveyDetail,
  SubmitSurveyResponseCommand,
  SubmitSurveyResponseResult,
} from "../model";

export interface ParticipantSurveyController {
  getParticipantSessionState(): Promise<ParticipantSessionState>;
  signInWithGoogle(command: ParticipantSignInCommand): Promise<void>;
  getPublishedSurveyByIdentifier(publicIdentifier: string): Promise<ParticipantSurveyDetail>;
  uploadQuestionImage(command: ParticipantQuestionImageUploadCommand): Promise<ParticipantQuestionImageUpload>;
  submitSurveyResponse(command: SubmitSurveyResponseCommand): Promise<SubmitSurveyResponseResult>;
}
