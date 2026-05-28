import { getSurveyPublicIdentifier, type PublishValidationIssue, type PublishValidationResult, type SurveyDetail } from "../../model";
import { validateQuestionConfig } from "./questionConfigSchema";

export function validatePublishSurveyDetail(detail: SurveyDetail): PublishValidationResult {
  const issues: PublishValidationIssue[] = [];

  if (!detail.survey.title.trim()) {
    issues.push({ severity: "error", code: "SURVEY_TITLE_REQUIRED", message: "Survey title is required." });
  }

  if (!getSurveyPublicIdentifier(detail.survey)) {
    issues.push({
      severity: "error",
      code: "SURVEY_PUBLIC_IDENTIFIER_REQUIRED",
      message: "Public slug or public code is required.",
    });
  }

  if (detail.sections.length === 0) {
    issues.push({ severity: "error", code: "SECTION_REQUIRED", message: "At least one section is required." });
  }

  const questionKeys = new Set<string>();
  const sectionQuestionCounts = new Map(detail.sections.map((section) => [section.id, 0]));

  for (const question of detail.questions) {
    sectionQuestionCounts.set(question.sectionId, (sectionQuestionCounts.get(question.sectionId) ?? 0) + 1);

    if (questionKeys.has(question.questionKey)) {
      issues.push({
        severity: "error",
        code: "DUPLICATE_QUESTION_KEY",
        message: `Duplicate question key: ${question.questionKey}`,
        questionId: question.id,
      });
    }
    questionKeys.add(question.questionKey);

    if (!question.title.ko.trim()) {
      issues.push({
        severity: "error",
        code: "QUESTION_TITLE_KO_REQUIRED",
        message: "Korean question title is required.",
        questionId: question.id,
      });
    }

    if (!question.title.en) {
      issues.push({
        severity: "warning",
        code: "QUESTION_TITLE_EN_MISSING",
        message: "English question title is missing.",
        questionId: question.id,
      });
    }

    for (const message of validateQuestionConfig(question)) {
      issues.push({ severity: "error", code: "QUESTION_CONFIG_INVALID", message, questionId: question.id });
    }
  }

  for (const section of detail.sections) {
    if ((sectionQuestionCounts.get(section.id) ?? 0) === 0) {
      issues.push({
        severity: "error",
        code: "SECTION_HAS_NO_QUESTIONS",
        message: "Each section must include at least one question.",
        sectionId: section.id,
      });
    }
  }

  return {
    canPublish: issues.every((issue) => issue.severity !== "error"),
    issues,
  };
}
