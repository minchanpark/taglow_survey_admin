import type { TextAnswer } from "../api/admin/model";
import { downloadCsvFile } from "./downloadHelper";

export function downloadTextAnswersCsv(surveyId: string, answers: TextAnswer[]): void {
  downloadCsvFile(buildTextAnswersCsvFilename(surveyId), buildTextAnswersCsvRows(answers));
}

export function buildTextAnswersCsvRows(answers: TextAnswer[]): unknown[][] {
  const exportableAnswers = answers.filter((answer) => !isBasicInfoAnswer(answer)).sort(compareTextAnswersForExport);
  return [
    ["섹션", "질문", "서술형 응답"],
    ...exportableAnswers.map((answer) => [
      answer.sectionTitle ?? "",
      answer.questionTitle ?? "",
      answer.textValue,
    ]),
  ];
}

function buildTextAnswersCsvFilename(surveyId: string): string {
  return `taglow-${surveyId}-text-answers-${new Date().toISOString().replace(/[:.]/g, "-")}.csv`;
}

function isBasicInfoAnswer(answer: TextAnswer): boolean {
  const normalizedSectionTitle = normalizeLabel(answer.sectionTitle);
  return (
    answer.questionType === "profile" ||
    normalizedSectionTitle === "기본정보" ||
    normalizedSectionTitle === "basicinfo" ||
    normalizedSectionTitle === "basicinformation"
  );
}

function normalizeLabel(value: string | undefined): string {
  return (value ?? "").replace(/[\s_-]+/g, "").toLocaleLowerCase("ko-KR");
}

function compareTextAnswersForExport(left: TextAnswer, right: TextAnswer): number {
  return (
    compareLabels(left.sectionTitle, right.sectionTitle) ||
    compareLabels(left.questionTitle, right.questionTitle) ||
    compareLabels(left.createdAt, right.createdAt) ||
    compareLabels(left.id, right.id)
  );
}

function compareLabels(left: string | undefined, right: string | undefined): number {
  return (left ?? "").localeCompare(right ?? "", "ko");
}
