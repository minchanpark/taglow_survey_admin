import type { ParticipantSurveyDetail } from "../model";
import type { ParticipantSurveyGateway } from "../service/gateway";
import { ParticipantSurveyMapper } from "../service/mapper";
import type { ParticipantSurveyController } from "./participantSurveyController";

export class GatewayBackedParticipantSurveyController implements ParticipantSurveyController {
  constructor(
    private readonly gateway: ParticipantSurveyGateway,
    private readonly mapper: ParticipantSurveyMapper = new ParticipantSurveyMapper(),
  ) {}

  async getPublishedSurveyByIdentifier(publicIdentifier: string): Promise<ParticipantSurveyDetail> {
    const survey = await this.gateway.getPublishedSurveyByIdentifier(publicIdentifier);
    const [sections, questions, assets] = await Promise.all([
      this.gateway.listSections(survey.id),
      this.gateway.listQuestions(survey.id),
      this.gateway.listAssets(survey.id),
    ]);

    return this.mapper.toDetail({ survey, sections, questions, assets });
  }
}
