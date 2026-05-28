import type { RawQuestion, RawSection, RawSurvey, RawSurveyAsset } from "../../../admin/service/gateway/rawTypes";

export interface ParticipantSurveyGateway {
  getPublishedSurveyByIdentifier(publicIdentifier: string): Promise<RawSurvey>;
  listSections(surveyId: string): Promise<RawSection[]>;
  listQuestions(surveyId: string): Promise<RawQuestion[]>;
  listAssets(surveyId: string): Promise<RawSurveyAsset[]>;
}
