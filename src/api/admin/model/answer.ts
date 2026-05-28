import type { JsonRecord } from "./common";
import type { MetricType } from "./question";

export type AnswerType = "scale" | "single_choice" | "multi_select" | "ranking" | "text" | "image_tag" | string;

export type SurveyAnswer = Readonly<{
  id: string;
  surveyId: string;
  responseId: string;
  sectionId?: string;
  questionId?: string;
  assetId?: string;
  answerType: AnswerType;
  metricType: MetricType;
  topicKey?: string;
  spaceKey?: string;
  scoreValue?: number;
  textValue?: string;
  choiceValue?: string;
  xRatio?: number;
  yRatio?: number;
  tagType?: string;
  severity?: number;
  valueJson: JsonRecord;
  createdAt: string;
  updatedAt?: string;
}>;
