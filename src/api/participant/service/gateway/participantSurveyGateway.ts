import type { RawQuestion, RawSection, RawSurvey, RawSurveyAsset } from "../../../admin/service/gateway/rawTypes";
import type { JsonRecord } from "../../../admin/model";
import type { SubmitSurveyResponseCommand, SubmitSurveyResponseResult } from "../../model";

export type RawParticipantAuthUser = Readonly<{
  id: string;
  email?: string;
}>;

export type RawParticipantQuestionImageUpload = Readonly<{
  storage_bucket: string;
  storage_path: string;
  signed_url?: string;
  metadata: JsonRecord;
}>;

export type RawParticipantLoginImage = Readonly<{
  asset_id: string;
  storage_bucket: string;
  storage_path: string;
  signed_url?: string;
}>;

export type RawParticipantLoginContent = Readonly<{
  title?: string;
  title_en?: string;
  headline?: string;
  headline_en?: string;
  body_paragraphs?: string[];
  body_paragraphs_en?: string[];
  header_image?: RawParticipantLoginImage | null;
  bottom_image?: RawParticipantLoginImage | null;
}>;

export interface ParticipantSurveyGateway {
  getCurrentAuthUser(): Promise<RawParticipantAuthUser | null>;
  signInWithGoogle(args: { redirectTo: string }): Promise<void>;
  getParticipantLoginContent(publicIdentifier: string): Promise<RawParticipantLoginContent | null>;
  getPublishedSurveyByIdentifier(publicIdentifier: string): Promise<RawSurvey>;
  listSections(surveyId: string): Promise<RawSection[]>;
  listQuestions(surveyId: string): Promise<RawQuestion[]>;
  listAssets(surveyId: string): Promise<RawSurveyAsset[]>;
  uploadQuestionImage(command: { surveyId: string; questionId: string; file: File }): Promise<RawParticipantQuestionImageUpload>;
  submitSurveyResponse(command: SubmitSurveyResponseCommand): Promise<SubmitSurveyResponseResult>;
}
