import type { JsonRecord } from "./common";
import type { Question } from "./question";
import type { SurveyAsset } from "./asset";
import type { SurveySection } from "./section";

export type SurveyStatus = "draft" | "published" | "closed" | "archived";

export type SurveySettings = JsonRecord;

export type Survey = Readonly<{
  id: string;
  title: string;
  description?: string;
  status: SurveyStatus;
  publicSlug?: string;
  publicCode?: string;
  versionGroupId: string;
  versionNumber: number;
  parentSurveyId?: string;
  isLatestVersion: boolean;
  settings: SurveySettings;
  createdBy: string;
  publishedAt?: string;
  closedAt?: string;
  createdAt: string;
  updatedAt: string;
}>;

export type SurveyDetail = Readonly<{
  survey: Survey;
  sections: SurveySection[];
  questions: Question[];
  assets: SurveyAsset[];
}>;

export function getSurveyPublicIdentifier(survey: Pick<Survey, "publicSlug" | "publicCode">): string | undefined {
  return survey.publicSlug ?? survey.publicCode;
}

export function getSurveyPublicPath(survey: Pick<Survey, "publicSlug" | "publicCode">): string | undefined {
  const identifier = getSurveyPublicIdentifier(survey);
  return identifier ? `/survey/${encodeURIComponent(identifier)}` : undefined;
}
