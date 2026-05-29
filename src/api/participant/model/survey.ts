import type { JsonRecord, Question, SurveyAsset, SurveySection } from "../../admin/model";

export type { JsonRecord, Question, SurveyAsset, SurveySection } from "../../admin/model";

export type ParticipantSurvey = Readonly<{
  id: string;
  title: string;
  description?: string;
  publicSlug?: string;
  publicCode?: string;
  publicIdentifier: string;
  versionNumber: number;
  settings: JsonRecord;
  publishedAt?: string;
}>;

export type ParticipantSurveyDetail = Readonly<{
  survey: ParticipantSurvey;
  sections: SurveySection[];
  questions: Question[];
  assets: SurveyAsset[];
}>;

export type ParticipantQuestionImageUploadCommand = Readonly<{
  surveyId: string;
  questionId: string;
  file: File;
}>;

export type ParticipantSignInCommand = Readonly<{
  redirectTo: string;
}>;

export type ParticipantSessionState = Readonly<{
  isAuthenticated: boolean;
  email?: string;
}>;

export type ParticipantQuestionImageUpload = Readonly<{
  storageBucket: string;
  storagePath: string;
  signedUrl?: string;
  metadata: JsonRecord;
}>;
