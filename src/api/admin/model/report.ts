import type {
  AnalysisFilters,
  ChoiceDistribution,
  PriorityIssue,
  ProfileDistribution,
  QuestionSummary,
  ResponseSummary,
  SectionSummary,
  TextAnswer,
  TextGroup,
} from "./analysis";

export type ReportBlockKind =
  | "overview"
  | "response_profile"
  | "priority"
  | "section_summary"
  | "question_summary"
  | "choice_distribution"
  | "text_evidence"
  | "recommendation"
  | "appendix";

export type ReportMetadata = Readonly<{
  title: string;
  term: string;
  reportDate: string;
  author: string;
  surveyPeriod: string;
  audience: string;
  method: string;
  purpose: string;
}>;

export type ReportEvidenceRef = Readonly<{
  id: string;
  label: string;
  source: "response_summary" | "priority" | "section" | "question" | "choice" | "text";
  n?: number;
}>;

export type ReportNarrativeBlockResult = Readonly<{
  blockId: string;
  summary: string;
  body: string[];
  evidenceIds: string[];
  caution?: string;
  suggestedActions: string[];
}>;

export type ReportBlock = Readonly<{
  id: string;
  kind: ReportBlockKind;
  title: string;
  summary: string;
  n: number;
  filters: AnalysisFilters;
  isLowSample: boolean;
  evidence: ReportEvidenceRef[];
  body?: string[];
  caution?: string;
  suggestedActions?: string[];
  narrativeEvidenceIds?: string[];
}>;

export type ReportDraft = Readonly<{
  surveyId: string;
  metadata: ReportMetadata;
  blocks: ReportBlock[];
  generatedAt: string;
}>;

export type ReportSourceData = Readonly<{
  responseSummary?: ResponseSummary;
  profileDistribution?: ProfileDistribution;
  priorities: PriorityIssue[];
  sectionSummaries: SectionSummary[];
  questionSummaries: QuestionSummary[];
  choiceDistributions: ChoiceDistribution[];
  textGroups: TextGroup[];
  textAnswers: TextAnswer[];
}>;

export type ReportNarrativeCommand = Readonly<{
  surveyId: string;
  metadata: ReportMetadata;
  filters: AnalysisFilters;
  blocks: ReportBlock[];
}>;

export type ReportNarrativeResult = Readonly<{
  generatedAt: string;
  blocks: ReportNarrativeBlockResult[];
}>;
