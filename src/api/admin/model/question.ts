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
  requireText: boolean;
  enableZoom: boolean;
}>;

export type AttentionCheckQuestionConfig = Readonly<{
  expectedValue: string;
  excludeIfFailed: boolean;
}>;

export type QuestionConfig =
  | ScaleQuestionConfig
  | SingleChoiceQuestionConfig
  | MultiSelectQuestionConfig
  | ImageTagQuestionConfig
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
