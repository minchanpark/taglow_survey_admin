import type { JsonRecord, LocalizedText, Question, SurveyAsset, SurveySection } from "../../admin/model";

export type { JsonRecord, LocalizedText, Question, SurveyAsset, SurveySection } from "../../admin/model";

export type ParticipantSurvey = Readonly<{
  id: string;
  title: LocalizedText;
  description?: LocalizedText;
  publicSlug?: string;
  publicCode?: string;
  publicIdentifier: string;
  versionNumber: number;
  settings: JsonRecord;
  startsAt?: string;
  endsAt?: string;
  publishedAt?: string;
}>;

export type ParticipantSurveyDetail = Readonly<{
  survey: ParticipantSurvey;
  sections: SurveySection[];
  questions: Question[];
  assets: SurveyAsset[];
}>;

export type ParticipantLoginImage = Readonly<{
  assetId: string;
  storageBucket: string;
  storagePath: string;
  signedUrl?: string;
}>;

export type ParticipantLoginContent = Readonly<{
  title?: string;
  titleEn?: string;
  headline?: string;
  headlineEn?: string;
  bodyParagraphs: readonly string[];
  bodyParagraphsEn: readonly string[];
  headerImage?: ParticipantLoginImage;
  bottomImage?: ParticipantLoginImage;
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
