import type { JsonRecord } from "./common";
import type { Question } from "./question";
import type { SurveyAsset } from "./asset";
import type { SurveySection } from "./section";

export type SurveyStatus = "draft" | "published" | "closed" | "archived";
export type SurveyAccessRole = "owner" | "editor" | "viewer";
export type SurveyCollaboratorRole = "editor" | "viewer";

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
  accessRole: SurveyAccessRole;
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

export type SurveyCollaborator = Readonly<{
  id: string;
  surveyId: string;
  email: string;
  role: SurveyCollaboratorRole;
  invitedBy?: string;
  createdAt: string;
  updatedAt: string;
  revokedAt?: string;
}>;

export function canEditSurvey(accessRole: SurveyAccessRole): boolean {
  return accessRole === "owner" || accessRole === "editor";
}

export function canManageSurvey(accessRole: SurveyAccessRole): boolean {
  return accessRole === "owner";
}

export function getSurveyAccessRoleLabel(accessRole: SurveyAccessRole): string {
  if (accessRole === "owner") return "내 설문";
  if (accessRole === "editor") return "작업 가능";
  return "결과 보기";
}
