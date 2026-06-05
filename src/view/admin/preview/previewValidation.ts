import {
  getChoiceOptions,
  getChoiceMatrix,
  getConfiguredAssetId,
  getNumber,
  getString,
  getStringArray,
  localizedText,
  toRecord,
  type Locale,
  type Question,
  type SurveyAsset,
  type SurveySection,
} from "../../../api/admin/model";

export type PreviewIssue = Readonly<{
  id: string;
  tone: "warning" | "danger";
  label: string;
  sectionId?: string;
  questionId?: string;
}>;

export function getPreviewIssues(sections: SurveySection[], questions: Question[], assets: SurveyAsset[], locale: Locale): PreviewIssue[] {
  const issues: PreviewIssue[] = [];
  const questionKeys = new Set<string>();

  if (!sections.length) {
    issues.push({ id: "no-sections", tone: "danger", label: "섹션이 없습니다." });
  }

  for (const section of sections) {
    const sectionQuestions = questions.filter((question) => question.sectionId === section.id);
    if (!sectionQuestions.length) {
      issues.push({ id: `section-empty-${section.id}`, tone: "danger", label: `${localizedText(section.title, locale)} 섹션에 질문이 없습니다.`, sectionId: section.id });
    }
  }

  for (const question of questions) {
    if (questionKeys.has(question.questionKey)) {
      issues.push({ id: `duplicate-${question.id}`, tone: "danger", label: `중복 question key: ${question.questionKey}`, questionId: question.id });
    }
    questionKeys.add(question.questionKey);

    if (!question.title.ko.trim()) {
      issues.push({ id: `title-ko-${question.id}`, tone: "danger", label: "한국어 질문 제목이 없습니다.", questionId: question.id });
    }

    if (locale === "en" && !question.title.en) {
      issues.push({ id: `title-en-${question.id}`, tone: "warning", label: `${question.questionKey} 영문 제목이 없습니다.`, questionId: question.id });
    }

    const config = toRecord(question.config);
    const options = getChoiceOptions(question);
    if ((question.questionType === "single_choice" || question.questionType === "multi_select" || question.questionType === "ranking" || question.questionType === "text") && Array.isArray(config.options) && !options.length) {
      issues.push({ id: `options-${question.id}`, tone: "danger", label: `${question.questionKey} 선택지가 없습니다.`, questionId: question.id });
    }

    if (question.questionType === "matrix_multi_select" && !getChoiceMatrix(question)) {
      issues.push({ id: `matrix-${question.id}`, tone: "danger", label: `${question.questionKey} 행/열 설정이 없습니다.`, questionId: question.id });
    }

    if ((question.questionType === "scale" || question.questionType === "attention_check") && (!getNumber(config.scaleMin) || !getNumber(config.scaleMax))) {
      issues.push({ id: `scale-${question.id}`, tone: "danger", label: `${question.questionKey} 척도 범위가 올바르지 않습니다.`, questionId: question.id });
    }

    if (question.questionType === "image_tag") {
      const assetId = getConfiguredAssetId(question);
      if (!assetId || !assets.some((asset) => asset.id === assetId)) {
        issues.push({ id: `asset-${question.id}`, tone: "danger", label: `${question.questionKey} 이미지 자산 연결이 없습니다.`, questionId: question.id });
      }
    }

    if (question.questionType === "participant_image_tag" && !getStringArray(config.tagTypes).length) {
      issues.push({ id: `participant-tags-${question.id}`, tone: "danger", label: `${question.questionKey} 태깅 카테고리가 없습니다.`, questionId: question.id });
    }

    if (question.questionType === "attention_check" && getString(config.expectedValue) === undefined && getNumber(config.expectedValue) === undefined) {
      issues.push({ id: `attention-${question.id}`, tone: "danger", label: `${question.questionKey} expectedValue가 없습니다.`, questionId: question.id });
    }
  }

  return issues;
}
