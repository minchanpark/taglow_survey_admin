import type { JsonRecord } from "./common";

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
}>;

export type TextAnswerFilters = AnalysisFilters & Readonly<{
  keyword?: string;
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

export type SectionSummary = Readonly<{
  sectionId: string;
  sectionTitle: string;
  averageScore: number | null;
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
