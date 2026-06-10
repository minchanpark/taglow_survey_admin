import type { IdentityResponse } from "../api/admin/model";
import { downloadCsvFile } from "./downloadHelper";

export function downloadIdentityRosterCsv(surveyId: string, responses: IdentityResponse[]): void {
  downloadCsvFile(buildIdentityRosterCsvFilename(surveyId), buildIdentityRosterCsvRows(responses));
}

export function buildIdentityRosterCsvRows(responses: IdentityResponse[]): unknown[][] {
  return [
    ["학번", "이름", "성별", "학기", "학부", "RC", "생활관", "인실", "생활관 경험", "제출 시각"],
    ...responses
      .filter((response) => response.studentNumber || response.name)
      .map((response) => [
        response.studentNumber ?? "",
        response.name ?? "",
        getProfileString(response.profile, "gender"),
        getProfileString(response.profile, "semesterGroup"),
        getProfileString(response.profile, "department"),
        getProfileString(response.profile, "rc"),
        getProfileString(response.profile, "dormitory"),
        getProfileString(response.profile, "roomType"),
        getProfileString(response.profile, "dormExperience"),
        formatExportDateTime(response.submittedAt),
      ]),
  ];
}

function buildIdentityRosterCsvFilename(surveyId: string): string {
  return `taglow-${surveyId}-detailed-roster-${new Date().toISOString().replace(/[:.]/g, "-")}.csv`;
}

function getProfileString(profile: IdentityResponse["profile"], key: string): string {
  const value = profile?.[key];
  return typeof value === "string" ? value : "";
}

function formatExportDateTime(value: string | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day} ${hour}:${minute}`;
}
