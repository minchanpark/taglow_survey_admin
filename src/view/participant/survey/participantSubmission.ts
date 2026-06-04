import {
  getConfiguredAssetId,
  getQuestionKind,
  getString,
  normalizeProfileFilterKey,
  toProfileFieldValue,
  toRecord,
  type JsonRecord,
  type Question,
} from "../../../api/admin/model";
import type { SubmitSurveyResponseCommand } from "../../../api/participant/model";
import type { ChoiceTextAnswer, ImageTagAnswer, ParticipantAnswer, ParticipantAnswers } from "./participantSurveyTypes";

export function buildSubmitSurveyResponseCommand(args: {
  surveyId: string;
  clientSubmissionId: string;
  locale?: string;
  startedAt: string;
  questions: Question[];
  answers: ParticipantAnswers;
}): SubmitSurveyResponseCommand {
  const submittedAnswers = args.questions.flatMap((question) => toSubmittedAnswers(question, args.answers[question.id]));
  const profile = buildSubmittedProfile(args.questions, args.answers);

  return {
    surveyId: args.surveyId,
    clientSubmissionId: args.clientSubmissionId,
    locale: args.locale ?? "ko",
    startedAt: args.startedAt,
    profile,
    rawPayload: {
      profile,
      answeredQuestionIds: submittedAnswers.map((answer) => answer.questionId),
    },
    answers: submittedAnswers,
  };
}

function toSubmittedAnswers(question: Question, answer: ParticipantAnswer): SubmitSurveyResponseCommand["answers"] {
  if (answer === undefined) return [];
  const base = {
    questionId: question.id,
    sectionId: question.sectionId,
    answerType: question.questionType,
    metricType: question.metricType ?? "none",
    topicKey: question.topicKey,
    spaceKey: question.spaceKey,
  };

  if (typeof answer === "number") {
    return [{ ...base, scoreValue: answer, valueJson: { value: answer } }];
  }

  if (typeof answer === "string") {
    const questionKind = getQuestionKind(question);
    if (questionKind === "single_choice" || question.questionType === "profile" || question.questionType === "experience") {
      return [{ ...base, choiceValue: answer, valueJson: { value: answer } }];
    }
    return [{ ...base, textValue: answer, valueJson: { value: answer } }];
  }

  if (Array.isArray(answer)) {
    return answer.map((value) => ({ ...base, choiceValue: value, valueJson: { value, selectedValues: answer } }));
  }

  if (isChoiceTextAnswer(answer)) {
    return [
      {
        ...base,
        choiceValue: answer.choiceValue,
        textValue: answer.text,
        valueJson: compactJsonRecord({
          choiceValue: answer.choiceValue,
          text: answer.text,
        }),
      },
    ];
  }

  if (isImageTagAnswer(answer)) {
    const configuredAssetId = getConfiguredAssetId(question);
    return answer.tags.map((tag) => ({
      ...base,
      assetId: configuredAssetId,
      xRatio: tag.xRatio,
      yRatio: tag.yRatio,
      tagType: tag.tagType,
      textValue: tag.text,
      valueJson: compactJsonRecord({
        tagId: tag.id,
        image: answer.image
          ? {
              storageBucket: answer.image.storageBucket,
              storagePath: answer.image.storagePath,
            }
          : undefined,
      }),
    }));
  }

  return [];
}

function buildSubmittedProfile(questions: Question[], answers: ParticipantAnswers): JsonRecord {
  const profile: JsonRecord = {};
  for (const question of questions) {
    if (question.questionType !== "profile") continue;
    const config = toRecord(question.config);
    const field = normalizeProfileField(getString(config.profileField));
    if (!field) continue;
    const value = getProfileAnswerValue(answers[question.id]);
    if (value) profile[field] = value;
  }
  return profile;
}

function normalizeProfileField(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const key = normalizeProfileFilterKey(value);
  return key ? toProfileFieldValue(key) : undefined;
}

function getProfileAnswerValue(answer: ParticipantAnswer): string | undefined {
  if (typeof answer === "string") return answer.trim() || undefined;
  if (isChoiceTextAnswer(answer)) return answer.choiceValue?.trim() || answer.text?.trim();
  return undefined;
}

function compactJsonRecord(values: Record<string, unknown>): JsonRecord {
  const record: JsonRecord = {};
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) continue;
    if (isRecord(value)) {
      record[key] = compactJsonRecord(value);
      continue;
    }
    if (Array.isArray(value)) {
      record[key] = value.filter((item): item is string | number | boolean => ["string", "number", "boolean"].includes(typeof item));
      continue;
    }
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean" || value === null) {
      record[key] = value;
    }
  }
  return record;
}

function isImageTagAnswer(value: unknown): value is ImageTagAnswer {
  return isRecord(value) && Array.isArray(value.tags);
}

function isChoiceTextAnswer(value: unknown): value is ChoiceTextAnswer {
  return isRecord(value) && !Array.isArray(value.tags);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
