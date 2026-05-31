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

export type SubmitSurveyResponseAnswer = Readonly<{
  questionId: string;
  sectionId?: string;
  assetId?: string;
  answerType: string;
  metricType?: string;
  topicKey?: string;
  spaceKey?: string;
  scoreValue?: number;
  textValue?: string;
  choiceValue?: string;
  xRatio?: number;
  yRatio?: number;
  tagType?: string;
  severity?: number;
  valueJson?: JsonRecord;
}>;

export type SubmitSurveyResponseCommand = Readonly<{
  surveyId: string;
  clientSubmissionId: string;
  locale?: string;
  startedAt?: string;
  profile: JsonRecord;
  rawPayload: JsonRecord;
  answers: SubmitSurveyResponseAnswer[];
}>;

export type SubmitSurveyResponseResult = Readonly<{
  responseId: string;
  submittedAt: string;
  alreadySubmitted: boolean;
  passedAttentionCheck: boolean;
}>;
