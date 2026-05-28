import type { JsonRecord, LocalizedText } from "./common";
import type { MetricType, QuestionConfig, QuestionType } from "./question";
import type { SectionType } from "./section";

export type QuestionSetTemplateId = "dorm_regular_25_2";

export type QuestionSetConflictMode = "append_skip_existing_keys";

export type QuestionSetSectionPreview = Readonly<{
  sectionKey: string;
  title: LocalizedText;
  sectionType: SectionType;
  orderIndex: number;
  questionCount: number;
  isExisting: boolean;
}>;

export type QuestionSetQuestionPreview = Readonly<{
  sourceNumber: number;
  sectionKey: string;
  questionKey: string;
  title: LocalizedText;
  questionType: QuestionType;
  metricType: MetricType;
  topicKey?: string;
  spaceKey?: string;
  config: QuestionConfig;
  isRequired: boolean;
  isExisting: boolean;
  displayGroup?: string;
}>;

export type QuestionSetImportPreview = Readonly<{
  templateId: QuestionSetTemplateId;
  title: string;
  sections: QuestionSetSectionPreview[];
  questions: QuestionSetQuestionPreview[];
  totalSectionCount: number;
  totalQuestionCount: number;
  importableSectionCount: number;
  importableQuestionCount: number;
  skippedQuestionCount: number;
}>;

export type QuestionSetImportPreviewCommand = Readonly<{
  surveyId: string;
  templateId: QuestionSetTemplateId;
}>;

export type QuestionSetImportCommand = QuestionSetImportPreviewCommand &
  Readonly<{
    conflictMode: QuestionSetConflictMode;
  }>;

export type QuestionSetImportResult = Readonly<{
  templateId: QuestionSetTemplateId;
  sectionsCreated: number;
  questionsCreated: number;
  questionsSkipped: number;
  sectionKeys: string[];
  questionKeys: string[];
}>;

export type QuestionSetTemplateSection = Readonly<{
  sectionKey: string;
  title: LocalizedText;
  sectionType: SectionType;
  settings?: JsonRecord;
  questions: QuestionSetTemplateQuestion[];
}>;

export type QuestionSetTemplateQuestion = Readonly<{
  sourceNumber: number;
  questionKey: string;
  title: LocalizedText;
  questionType: QuestionType;
  metricType: MetricType;
  topicKey?: string;
  spaceKey?: string;
  config: QuestionConfig;
  validation?: JsonRecord;
  isRequired: boolean;
  displayGroup?: string;
}>;

export type QuestionSetTemplate = Readonly<{
  templateId: QuestionSetTemplateId;
  title: string;
  sections: QuestionSetTemplateSection[];
}>;
