import type {
  ParticipantQuestionImageUpload,
  ParticipantQuestionImageUploadCommand,
  ParticipantSessionState,
  ParticipantSignInCommand,
  ParticipantSurveyDetail,
} from "../model";

export interface ParticipantSurveyController {
  getParticipantSessionState(): Promise<ParticipantSessionState>;
  signInWithGoogle(command: ParticipantSignInCommand): Promise<void>;
  getPublishedSurveyByIdentifier(publicIdentifier: string): Promise<ParticipantSurveyDetail>;
  uploadQuestionImage(command: ParticipantQuestionImageUploadCommand): Promise<ParticipantQuestionImageUpload>;
}
