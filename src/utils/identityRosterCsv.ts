import type { IdentityResponse } from "../api/admin/model";
import { createExcelTextFormulaCell, downloadCsvFile } from "./downloadHelper";

export function downloadIdentityRosterCsv(surveyId: string, responses: IdentityResponse[]): void {
  downloadCsvFile(buildIdentityRosterCsvFilename(surveyId), buildIdentityRosterCsvRows(responses));
}

export function buildIdentityRosterCsvRows(responses: IdentityResponse[]): unknown[][] {
  return [
    ["학번", "이름", "성별", "학기", "학부", "RC", "생활관", "인실", "생활관 경험"],
    ...responses
      .filter((response) => response.studentNumber || response.name)
      .map((response) => [
        formatStudentNumberForExcel(response.studentNumber),
        response.name ?? "",
        getProfileString(response.profile, "gender"),
        getProfileString(response.profile, "semesterGroup"),
        getProfileString(response.profile, "department"),
        getProfileString(response.profile, "rc"),
        getProfileString(response.profile, "dormitory"),
        getProfileString(response.profile, "roomType"),
        getProfileString(response.profile, "dormExperience"),
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

function formatStudentNumberForExcel(value: string | undefined): unknown {
  return value ? createExcelTextFormulaCell(value) : "";
}
