import type { JsonRecord, LocalizedText } from "./common";

export type SectionType =
  | "intro"
  | "general"
  | "profile"
  | "facility"
  | "laundry"
  | "global_lounge"
  | "identity"
  | "completion"
  | "satisfaction"
  | "space_tagging"
  | "free_text"
  | "submitter";

export type SurveySection = Readonly<{
  id: string;
  surveyId: string;
  sectionKey: string;
  title: LocalizedText;
  description?: LocalizedText;
  orderIndex: number;
  sectionType: SectionType;
  settings: JsonRecord;
  createdAt?: string;
  updatedAt?: string;
}>;
