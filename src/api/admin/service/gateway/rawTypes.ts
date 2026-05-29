import type { JsonRecord } from "../../model";

export type RawAdminMember = Readonly<{
  id: string;
  user_id: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}>;

export type RawAdminAuthUser = Readonly<{
  id: string;
  email?: string;
}>;

export type RawSurvey = Readonly<{
  id: string;
  title: string;
  description: string | null;
  status: string;
  public_slug: string | null;
  public_code?: string | null;
  version_group_id: string;
  version_number: number;
  parent_survey_id: string | null;
  is_latest_version: boolean;
  settings: JsonRecord | null;
  created_by: string;
  published_at: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
}>;

export type RawSection = Readonly<{
  id: string;
  survey_id: string;
  section_key: string;
  title_ko: string;
  title_en: string | null;
  description_ko: string | null;
  description_en: string | null;
  order_index: number;
  section_type: string;
  settings: JsonRecord | null;
  created_at?: string;
  updated_at?: string;
}>;

export type RawQuestion = Readonly<{
  id: string;
  survey_id: string;
  section_id: string;
  question_key: string;
  question_type: string;
  title_ko: string;
  title_en: string | null;
  description_ko: string | null;
  description_en: string | null;
  order_index: number;
  is_required: boolean;
  metric_type: string | null;
  topic_key: string | null;
  space_key: string | null;
  config: JsonRecord | null;
  validation: JsonRecord | null;
  created_at?: string;
  updated_at?: string;
}>;

export type RawSurveyAsset = Readonly<{
  id: string;
  survey_id: string;
  section_id: string | null;
  question_id: string | null;
  asset_type: string;
  storage_bucket: string;
  storage_path: string;
  metadata: JsonRecord | null;
  created_at: string;
  updated_at?: string;
}>;

export type RawCreateSurveyPayload = Partial<Pick<RawSurvey, "description" | "settings">> & Pick<RawSurvey, "title">;
export type RawInsertSurveyPayload = RawCreateSurveyPayload & Pick<RawSurvey, "created_by">;
export type RawUpdateSurveyPayload = Partial<
  Pick<RawSurvey, "title" | "description" | "status" | "public_slug" | "public_code" | "settings" | "published_at" | "closed_at">
>;

export type RawCreateSectionPayload = Pick<
  RawSection,
  "survey_id" | "section_key" | "title_ko" | "order_index"
> &
  Partial<Pick<RawSection, "title_en" | "description_ko" | "description_en" | "section_type" | "settings">>;
export type RawUpdateSectionPayload = Partial<
  Pick<RawSection, "section_key" | "title_ko" | "title_en" | "description_ko" | "description_en" | "order_index" | "section_type" | "settings">
>;

export type RawCreateQuestionPayload = Pick<
  RawQuestion,
  "survey_id" | "section_id" | "question_key" | "question_type" | "title_ko" | "order_index"
> &
  Partial<
    Pick<
      RawQuestion,
      "title_en" | "description_ko" | "description_en" | "is_required" | "metric_type" | "topic_key" | "space_key" | "config" | "validation"
    >
  >;
export type RawUpdateQuestionPayload = Partial<
  Pick<
    RawQuestion,
    | "question_type"
    | "question_key"
    | "title_ko"
    | "title_en"
    | "description_ko"
    | "description_en"
    | "order_index"
    | "is_required"
    | "metric_type"
    | "topic_key"
    | "space_key"
    | "config"
    | "validation"
  >
>;

export type RawCreateAssetPayload = Pick<RawSurveyAsset, "survey_id" | "asset_type" | "storage_bucket" | "storage_path"> &
  Partial<Pick<RawSurveyAsset, "section_id" | "question_id" | "metadata">>;
export type RawUpdateAssetPayload = Partial<Pick<RawSurveyAsset, "section_id" | "question_id" | "metadata">>;

export type RawFilterOptions = Readonly<{
  genders: string[] | null;
  semester_groups: string[] | null;
  departments: string[] | null;
  rcs: string[] | null;
  dormitories: string[] | null;
  room_types: string[] | null;
  dorm_experiences: string[] | null;
}>;

export type AnalysisQueryArgs = Readonly<{
  surveyId: string;
  filters: JsonRecord;
}>;

export type HeatmapQueryArgs = AnalysisQueryArgs;
export type TextAnswerQueryArgs = AnalysisQueryArgs;

export type RawSectionSummary = Readonly<{
  section_id: string;
  section_title: string | null;
  avg_score?: number | null;
  average_score?: number | null;
  n: number;
}>;

export type RawBorichResult = Readonly<{
  topic_key: string;
  avg_importance?: number | null;
  avg_satisfaction?: number | null;
  avg_gap?: number | null;
  average_importance?: number | null;
  average_satisfaction?: number | null;
  gap?: number | null;
  borich_score: number | null;
  n: number;
}>;

export type RawHeatmapPoint = Readonly<{
  answer_id?: string;
  asset_id: string | null;
  x_ratio: number | null;
  y_ratio: number | null;
  tag_type: string | null;
  severity: number | null;
  text_value: string | null;
  dormitory?: string | null;
  room_type?: string | null;
  rc?: string | null;
  response_profile?: JsonRecord | null;
}>;

export type RawImageTagAnswer = Readonly<{
  answer_id?: string;
  id?: string;
  response_id?: string;
  section_id: string | null;
  section_title: string | null;
  question_id: string | null;
  question_title: string | null;
  question_type: string | null;
  asset_id: string | null;
  answer_type: string;
  x_ratio: number | null;
  y_ratio: number | null;
  tag_type: string | null;
  severity: number | null;
  text_value: string | null;
  value_json?: JsonRecord | null;
  image_storage_bucket?: string | null;
  image_storage_path?: string | null;
  image_signed_url?: string | null;
  dormitory?: string | null;
  room_type?: string | null;
  rc?: string | null;
  department?: string | null;
  response_profile?: JsonRecord | null;
  created_at: string;
}>;

export type RawTextAnswer = Readonly<{
  id?: string;
  answer_id?: string;
  response_id?: string;
  section_id: string | null;
  question_id: string | null;
  topic_key: string | null;
  space_key: string | null;
  text_value: string | null;
  value_json?: JsonRecord | null;
  dormitory?: string | null;
  room_type?: string | null;
  rc?: string | null;
  department?: string | null;
  profile?: JsonRecord | null;
  created_at: string;
}>;
