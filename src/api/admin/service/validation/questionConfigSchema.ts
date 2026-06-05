import type { Question, QuestionConfig } from "../../model";

export function validateQuestionConfig(question: Question): string[] {
  const config = question.config as QuestionConfig & Record<string, unknown>;
  const issues: string[] = [];

  if (question.questionType === "scale") {
    if (typeof config.scaleMin !== "number" || typeof config.scaleMax !== "number") {
      issues.push("Scale questions require scaleMin and scaleMax.");
    }
    if (!Array.isArray(config.labelsKo) || config.labelsKo.length === 0) {
      issues.push("Scale questions require labelsKo.");
    }
  }

  if (question.questionType === "single_choice" && !Array.isArray(config.options)) {
    issues.push("Single choice questions require options.");
  }

  if (question.questionType === "multi_select" && !Array.isArray(config.options)) {
    issues.push("Multi select questions require options.");
  }

  if (question.questionType === "matrix_multi_select") {
    if (!Array.isArray(config.matrixRows) || config.matrixRows.length === 0) {
      issues.push("Matrix multi select questions require matrixRows.");
    }
    if (!Array.isArray(config.matrixColumns) || config.matrixColumns.length === 0) {
      issues.push("Matrix multi select questions require matrixColumns.");
    }
    if (!Array.isArray(config.options) || config.options.length === 0) {
      issues.push("Matrix multi select questions require generated options.");
    }
  }

  if (question.questionType === "image_tag" && !config.assetId) {
    issues.push("Image tag questions require assetId.");
  }

  if (question.questionType === "participant_image_tag") {
    if (!Array.isArray(config.tagTypes) || config.tagTypes.length === 0) {
      issues.push("Participant image tag questions require tagTypes.");
    }
    if (typeof config.maxTags !== "number" || config.maxTags < 1) {
      issues.push("Participant image tag questions require maxTags.");
    }
  }

  if (question.questionType === "attention_check" && config.expectedValue === undefined) {
    issues.push("Attention check questions require expectedValue.");
  }
  if (question.questionType === "attention_check") {
    if (typeof config.scaleMin !== "number" || typeof config.scaleMax !== "number") {
      issues.push("Attention check questions require scaleMin and scaleMax.");
    }
    if (!Array.isArray(config.labelsKo) || config.labelsKo.length === 0) {
      issues.push("Attention check questions require labelsKo.");
    }
  }

  return issues;
}
