export type ParticipantSurveyApiErrorCode = "SURVEY_NOT_FOUND" | "UNAUTHENTICATED" | "UPLOAD_FAILED" | "SUBMIT_FAILED" | "UNKNOWN";

export class ParticipantSurveyApiError extends Error {
  constructor(
    readonly code: ParticipantSurveyApiErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "ParticipantSurveyApiError";
  }
}

export function normalizeParticipantSurveyApiError(
  error: unknown,
  fallbackCode: ParticipantSurveyApiErrorCode = "UNKNOWN",
): ParticipantSurveyApiError {
  if (error instanceof ParticipantSurveyApiError) return error;
  if (error instanceof Error) return new ParticipantSurveyApiError(fallbackCode, error.message);
  return new ParticipantSurveyApiError(fallbackCode, "Participant survey API request failed.");
}
