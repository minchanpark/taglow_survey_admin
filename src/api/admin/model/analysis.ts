import type { JsonRecord } from "./common";
import type { ProfileDistributionKey } from "./profileOptions";
import type { QuestionType } from "./question";

export type AnalysisFilters = Readonly<{
  gender?: string;
  semesterGroup?: string;
  department?: string;
  rc?: string;
  dormitory?: string;
  roomType?: string;
  dormExperience?: string;
  sectionId?: string;
  topicKey?: string;
  spaceKey?: string;
}>;

export type HeatmapFilters = AnalysisFilters & Readonly<{
  assetId?: string;
  tagType?: string;
  cursor?: string;
  limit?: number;
}>;

export type TextAnswerFilters = AnalysisFilters & Readonly<{
  keyword?: string;
  cursor?: string;
  limit?: number;
}>;

export type PaginatedResult<T> = Readonly<{
  items: T[];
  nextCursor?: string;
}>;

export type GroupCompareDimension = "gender" | "semesterGroup" | "department" | "rc" | "dormitory" | "roomType" | "dormExperience";

export type GroupCompareFilters = AnalysisFilters & Readonly<{
  groupBy: GroupCompareDimension;
  targetKind?: "survey" | "section" | "question" | "topic";
  targetId?: string;
  metricType?: "satisfaction" | "importance";
}>;

export type FilterOptions = Readonly<{
  genders: string[];
  semesterGroups: string[];
  departments: string[];
  rcs: string[];
  dormitories: string[];
  roomTypes: string[];
  dormExperiences: string[];
}>;

export type ProfileDistributionItem = Readonly<{
  key: string;
  label: string;
  n: number;
  percentage: number;
  isUnclassified?: boolean;
}>;

export type ProfileDistribution = Readonly<Record<ProfileDistributionKey, ProfileDistributionItem[]>>;

export type LowSampleGroup = Readonly<{
  dimension: ProfileDistributionKey;
  label: string;
  n: number;
}>;

export type ResponseSummary = Readonly<{
  totalResponses: number;
  submittedResponses: number;
  filteredResponses: number;
  lowSampleThreshold: number;
  isLowSample: boolean;
  profileDistribution: ProfileDistribution;
  lowSampleGroups: LowSampleGroup[];
}>;

export type SectionSummary = Readonly<{
  sectionId: string;
  sectionTitle: string;
  averageScore: number | null;
  n: number;
}>;

export type QuestionSummary = Readonly<{
  questionId: string;
  questionTitle: string;
  sectionId?: string;
  sectionTitle?: string;
  topicKey?: string;
  metricType?: "satisfaction" | "importance" | "experience" | "none";
  averageScore: number | null;
  standardDeviation: number | null;
  n: number;
}>;

export type ChoiceDistribution = Readonly<{
  questionId: string;
  questionTitle: string;
  sectionId?: string;
  sectionTitle?: string;
  optionValue: string;
  optionLabel: string;
  count: number;
  n: number;
  percentage: number;
}>;

export type GroupCompareResult = Readonly<{
  groupKey: string;
  groupLabel: string;
  averageScore: number | null;
  n: number;
  isHighest: boolean;
  isLowest: boolean;
  isLowSample: boolean;
}>;

export type PriorityIssue = Readonly<{
  id: string;
  label: string;
  source: "borich" | "low_satisfaction" | "text" | "heatmap" | "mixed";
  topicKey?: string;
  sectionTitle?: string;
  averageImportance: number | null;
  averageSatisfaction: number | null;
  gap: number | null;
  borichScore: number | null;
  textCount: number;
  tagCount: number;
  n: number;
}>;

export type BorichResult = Readonly<{
  topicKey: string;
  averageImportance: number | null;
  averageSatisfaction: number | null;
  gap: number | null;
  borichScore: number | null;
  n: number;
}>;

export type LocusQuadrant = "top_priority" | "maintain_strengthen" | "gradual_improvement" | "maintain";

export type LocusPoint = Readonly<{
  topicKey: string;
  label: string;
  averageImportance: number | null;
  averageSatisfaction: number | null;
  gap: number | null;
  n: number;
  quadrant: LocusQuadrant;
}>;

export type HeatmapPoint = Readonly<{
  id?: string;
  assetId?: string;
  xRatio: number;
  yRatio: number;
  tagType?: string;
  severity?: number;
  textValue?: string;
  responseProfile?: JsonRecord;
}>;

export type TextAnswer = Readonly<{
  id: string;
  responseId?: string;
  sectionId?: string;
  questionId?: string;
  topicKey?: string;
  spaceKey?: string;
  textValue: string;
  valueJson: JsonRecord;
  profile?: JsonRecord;
  createdAt: string;
}>;

export type TextGroup = Readonly<{
  groupKey: string;
  label: string;
  topicKey?: string;
  issueType?: string;
  questionId?: string;
  count: number;
  n: number;
  representativeTexts: string[];
}>;

export type ImageTagAnswerImage = Readonly<{
  assetId?: string;
  storageBucket?: string;
  storagePath?: string;
  signedUrl?: string;
  source: "survey_asset" | "participant_upload";
}>;

export type ImageTagAnswerKind = "admin_image" | "participant_upload";

export type ImageTagAnswer = Readonly<{
  id: string;
  responseId?: string;
  sectionId?: string;
  sectionTitle?: string;
  questionId?: string;
  questionTitle: string;
  questionType: Extract<QuestionType, "image_tag" | "participant_image_tag">;
  kind: ImageTagAnswerKind;
  assetId?: string;
  image?: ImageTagAnswerImage;
  xRatio: number;
  yRatio: number;
  tagType?: string;
  severity?: number;
  textValue?: string;
  valueJson: JsonRecord;
  responseProfile?: JsonRecord;
  createdAt: string;
}>;
