import type { JsonRecord, LocalizedText } from "./common";

export type QuestionType =
  | "profile"
  | "experience"
  | "scale"
  | "single_choice"
  | "multi_select"
  | "ranking"
  | "text"
  | "image_tag"
  | "participant_image_tag"
  | "attention_check";

export type MetricType = "none" | "satisfaction" | "importance" | "experience";

export type ChoiceOption = Readonly<{
  value: string;
  labelKo: string;
  labelEn?: string;
}>;

export type ScaleQuestionConfig = Readonly<{
  scaleMin: number;
  scaleMax: number;
  labelsKo: string[];
  labelsEn?: string[];
}>;

export type SingleChoiceQuestionConfig = Readonly<{
  options: ChoiceOption[];
}>;

export type MultiSelectQuestionConfig = Readonly<{
  minSelect?: number;
  maxSelect?: number;
  options: ChoiceOption[];
}>;

export type ImageTagQuestionConfig = Readonly<{
  assetId?: string;
  maxTags: number;
  tagTypes: string[];
  tagTypesEn?: string[];
  requireText: boolean;
  enableZoom: boolean;
}>;

export type ParticipantImageTagQuestionConfig = Readonly<{
  maxTags: number;
  tagTypes: string[];
  tagTypesEn?: string[];
  requireText: boolean;
  enableZoom: boolean;
  acceptedMimeTypes: string[];
  maxFileSizeMb: number;
}>;

export type AttentionCheckQuestionConfig = Readonly<{
  scaleMin: number;
  scaleMax: number;
  labelsKo: string[];
  labelsEn?: string[];
  expectedValue: string | number;
  excludeIfFailed: boolean;
}>;

export type QuestionConfig =
  | ScaleQuestionConfig
  | SingleChoiceQuestionConfig
  | MultiSelectQuestionConfig
  | ImageTagQuestionConfig
  | ParticipantImageTagQuestionConfig
  | AttentionCheckQuestionConfig
  | JsonRecord;

export type QuestionValidation = JsonRecord;

export type Question = Readonly<{
  id: string;
  surveyId: string;
  sectionId: string;
  questionKey: string;
  questionType: QuestionType;
  title: LocalizedText;
  description?: LocalizedText;
  orderIndex: number;
  isRequired: boolean;
  metricType: MetricType;
  topicKey?: string;
  spaceKey?: string;
  config: QuestionConfig;
  validation: QuestionValidation;
  createdAt?: string;
  updatedAt?: string;
}>;
