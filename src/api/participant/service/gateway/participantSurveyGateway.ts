import type { RawQuestion, RawSection, RawSurvey, RawSurveyAsset } from "../../../admin/service/gateway/rawTypes";
import type { JsonRecord } from "../../../admin/model";

export type RawParticipantQuestionImageUpload = Readonly<{
  storage_bucket: string;
  storage_path: string;
  signed_url?: string;
  metadata: JsonRecord;
}>;

export interface ParticipantSurveyGateway {
  getPublishedSurveyByIdentifier(publicIdentifier: string): Promise<RawSurvey>;
  listSections(surveyId: string): Promise<RawSection[]>;
  listQuestions(surveyId: string): Promise<RawQuestion[]>;
  listAssets(surveyId: string): Promise<RawSurveyAsset[]>;
  uploadQuestionImage(command: { surveyId: string; questionId: string; file: File }): Promise<RawParticipantQuestionImageUpload>;
}
