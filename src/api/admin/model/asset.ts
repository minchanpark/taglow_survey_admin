import type { JsonRecord } from "./common";

export type SurveyAssetType = "image" | "export" | "attachment";

export type SurveyAsset = Readonly<{
  id: string;
  surveyId: string;
  sectionId?: string;
  questionId?: string;
  assetType: SurveyAssetType;
  storageBucket: string;
  storagePath: string;
  metadata: JsonRecord;
  createdAt: string;
  updatedAt?: string;
}>;
