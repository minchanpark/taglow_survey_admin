import type { JsonRecord, Locale } from "./common";

export type ResponseStatus = "in_progress" | "submitted" | "discarded";

export type SurveyResponse = Readonly<{
  id: string;
  surveyId: string;
  participantUserId?: string;
  participantEmail?: string;
  status: ResponseStatus;
  locale: Locale;
  gender?: string;
  semesterGroup?: string;
  department?: string;
  rc?: string;
  dormitory?: string;
  roomType?: string;
  dormExperience?: string;
  profileJson: JsonRecord;
  rawPayload: JsonRecord;
  startedAt?: string;
  submittedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}>;
