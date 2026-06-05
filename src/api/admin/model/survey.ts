import type { JsonRecord, Locale, LocalizedText } from "./common";
import type { Question } from "./question";
import type { SurveyAsset } from "./asset";
import type { SurveySection } from "./section";

export type SurveyStatus = "draft" | "published" | "closed" | "archived";
export type SurveyAccessRole = "owner" | "manager" | "editor" | "viewer";
export type SurveyCollaboratorRole = "manager" | "editor" | "viewer";

export type SurveySettings = JsonRecord;

export type ParticipantLoginImageSlot = "header" | "bottom";

export type ParticipantLoginContentSettings = Readonly<{
  headerImageAssetId?: string;
  headline?: string;
  headlineEn?: string;
  bodyParagraphs: readonly string[];
  bodyParagraphsEn: readonly string[];
  bottomImageAssetId?: string;
}>;

export type Survey = Readonly<{
  id: string;
  title: string;
  titleEn?: string;
  description?: LocalizedText;
  status: SurveyStatus;
  publicSlug?: string;
  publicCode?: string;
  versionGroupId: string;
  versionNumber: number;
  parentSurveyId?: string;
  isLatestVersion: boolean;
  settings: SurveySettings;
  createdBy: string;
  startsAt?: string;
  endsAt?: string;
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
  return survey.publicSlug?.trim() || survey.publicCode?.trim() || undefined;
}

export function getSurveyPublicPath(survey: Pick<Survey, "publicSlug" | "publicCode">): string | undefined {
  const identifier = getSurveyPublicIdentifier(survey);
  return identifier ? `/survey/${encodeURIComponent(identifier)}` : undefined;
}

export function localizedSurveyTitle(survey: Pick<Survey, "title" | "titleEn">, locale: Locale): string {
  return locale === "en" ? survey.titleEn?.trim() || survey.title : survey.title;
}

export function getParticipantLoginContentSettings(settings: SurveySettings | undefined): ParticipantLoginContentSettings {
  const raw = getRecord(settings, "participantLogin");
  return {
    headerImageAssetId: getString(raw, "headerImageAssetId"),
    headline: getString(raw, "headline"),
    headlineEn: getString(raw, "headlineEn"),
    bodyParagraphs: normalizeBodyParagraphs(raw?.bodyParagraphs),
    bodyParagraphsEn: normalizeBodyParagraphs(raw?.bodyParagraphsEn),
    bottomImageAssetId: getString(raw, "bottomImageAssetId"),
  };
}

export function withParticipantLoginContentSettings(
  settings: SurveySettings | undefined,
  loginContent: ParticipantLoginContentSettings,
): SurveySettings {
  const bodyParagraphs = normalizeBodyParagraphs(loginContent.bodyParagraphs);
  const bodyParagraphsEn = normalizeBodyParagraphs(loginContent.bodyParagraphsEn);
  return {
    ...(settings ?? {}),
    participantLogin: {
      ...(loginContent.headerImageAssetId ? { headerImageAssetId: loginContent.headerImageAssetId } : {}),
      ...(loginContent.headline ? { headline: loginContent.headline.trim() } : {}),
      ...(loginContent.headlineEn ? { headlineEn: loginContent.headlineEn.trim() } : {}),
      bodyParagraphs,
      bodyParagraphsEn,
      ...(loginContent.bottomImageAssetId ? { bottomImageAssetId: loginContent.bottomImageAssetId } : {}),
    },
  };
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
  return accessRole === "owner" || accessRole === "manager" || accessRole === "editor";
}

export function canInviteSurvey(accessRole: SurveyAccessRole): boolean {
  return accessRole === "owner" || accessRole === "manager";
}

export function canManageSurvey(accessRole: SurveyAccessRole): boolean {
  return accessRole === "owner";
}

export function getSurveyAccessRoleLabel(accessRole: SurveyAccessRole): string {
  if (accessRole === "owner") return "내 설문";
  if (accessRole === "manager") return "초대 가능";
  if (accessRole === "editor") return "작업 가능";
  return "결과보기";
}

function normalizeBodyParagraphs(value: unknown): string[] {
  const values = Array.isArray(value) ? value : [];
  return [0, 1].map((index) => (typeof values[index] === "string" ? values[index].trim() : ""));
}

function getRecord(settings: SurveySettings | undefined, key: string): JsonRecord | undefined {
  const value = settings?.[key];
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value : undefined;
}

function getString(record: JsonRecord | undefined, key: string): string | undefined {
  const value = record?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
