import type { CreateSurveyCommand, UpdateSurveyCommand } from "../../model";

export function assertCreateSurveyCommand(command: CreateSurveyCommand): void {
  if (!command.title.trim()) {
    throw new Error("Survey title is required.");
  }
}

export function assertUpdateSurveyCommand(command: UpdateSurveyCommand): void {
  if (!command.surveyId) {
    throw new Error("surveyId is required.");
  }

  if ("startsAt" in command && command.startsAt && Number.isNaN(Date.parse(command.startsAt))) {
    throw new Error("startsAt must be a valid ISO timestamp.");
  }

  if ("endsAt" in command && command.endsAt && Number.isNaN(Date.parse(command.endsAt))) {
    throw new Error("endsAt must be a valid ISO timestamp.");
  }

  if (command.startsAt && command.endsAt && Date.parse(command.startsAt) >= Date.parse(command.endsAt)) {
    throw new Error("endsAt must be later than startsAt.");
  }
}
