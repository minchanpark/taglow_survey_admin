import type {
  ParticipantQuestionImageUpload,
  ParticipantQuestionImageUploadCommand,
  ParticipantLoginContent,
  ParticipantSessionState,
  ParticipantSignInCommand,
  ParticipantSurveyDetail,
  SubmitSurveyResponseCommand,
  SubmitSurveyResponseResult,
} from "../model";
import type { ParticipantSurveyGateway } from "../service/gateway";
import { ParticipantSurveyMapper } from "../service/mapper";
import type { ParticipantSurveyController } from "./participantSurveyController";

export class GatewayBackedParticipantSurveyController implements ParticipantSurveyController {
  constructor(
    private readonly gateway: ParticipantSurveyGateway,
    private readonly mapper: ParticipantSurveyMapper = new ParticipantSurveyMapper(),
  ) {}

  async getParticipantSessionState(): Promise<ParticipantSessionState> {
    const user = await this.gateway.getCurrentAuthUser();
    return user
      ? {
          isAuthenticated: true,
          email: user.email?.toLowerCase(),
        }
      : {
          isAuthenticated: false,
        };
  }

  signInWithGoogle(command: ParticipantSignInCommand): Promise<void> {
    return this.gateway.signInWithGoogle(command);
  }

  async getParticipantLoginContent(publicIdentifier: string): Promise<ParticipantLoginContent | null> {
    const content = await this.gateway.getParticipantLoginContent(publicIdentifier);
    return this.mapper.toLoginContent(content);
  }

  async getPublishedSurveyByIdentifier(publicIdentifier: string): Promise<ParticipantSurveyDetail> {
    const survey = await this.gateway.getPublishedSurveyByIdentifier(publicIdentifier);
    const [sections, questions, assets] = await Promise.all([
      this.gateway.listSections(survey.id),
      this.gateway.listQuestions(survey.id),
      this.gateway.listAssets(survey.id),
    ]);

    return this.mapper.toDetail({ survey, sections, questions, assets });
  }

  async uploadQuestionImage(command: ParticipantQuestionImageUploadCommand): Promise<ParticipantQuestionImageUpload> {
    const uploaded = await this.gateway.uploadQuestionImage(command);
    return {
      storageBucket: uploaded.storage_bucket,
      storagePath: uploaded.storage_path,
      signedUrl: uploaded.signed_url,
      metadata: uploaded.metadata,
    };
  }

  submitSurveyResponse(command: SubmitSurveyResponseCommand): Promise<SubmitSurveyResponseResult> {
    return this.gateway.submitSurveyResponse(command);
  }
}
