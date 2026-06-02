import type { SurveyAsset } from "./asset";
import type { JsonRecord, JsonValue, Locale, LocalizedText } from "./common";
import type { ChoiceOption, Question, QuestionConfig, QuestionType } from "./question";
import type { SurveySection } from "./section";

export type RenderableQuestionKind = QuestionType | "short_text" | "choice_text";
export type AnswerMap = Readonly<Record<string, unknown>>;

export function toRecord(value: unknown): JsonRecord {
  return isRecord(value) ? value : {};
}

export function getString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function getNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

export function getStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];
}

export function localizedText(value: LocalizedText, locale: Locale): string {
  return locale === "en" ? value.en || value.ko : value.ko;
}

export function localizedOption(value: ChoiceOption, locale: Locale): string {
  return locale === "en" ? value.labelEn || value.labelKo : value.labelKo;
}

export function sortByOrder<TItem extends { orderIndex: number }>(items: readonly TItem[]): TItem[] {
  return [...items].sort((a, b) => a.orderIndex - b.orderIndex);
}

export function isIntroSection(section: SurveySection): boolean {
  return section.sectionType === "intro" || section.sectionKey.toLowerCase().includes("intro");
}

export function getAnswerSections(sections: readonly SurveySection[]): SurveySection[] {
  return sortByOrder(sections).filter((section) => !isIntroSection(section));
}

export function groupQuestionsBySection(questions: readonly Question[]): Map<string, Question[]> {
  const grouped = new Map<string, Question[]>();
  for (const question of sortByOrder(questions)) {
    const items = grouped.get(question.sectionId) ?? [];
    items.push(question);
    grouped.set(question.sectionId, items);
  }
  return grouped;
}

export function getQuestionKind(question: Question): RenderableQuestionKind {
  if (question.questionType === "attention_check") return "scale";
  if (question.questionType === "profile") {
    const config = toRecord(question.config);
    return getString(config.inputType) === "single_choice" ? "single_choice" : "text";
  }
  if (isShortTextQuestion(question)) return "short_text";
  if (isChoiceTextQuestion(question)) return "choice_text";
  return question.questionType;
}

export function isShortTextQuestion(question: Question): boolean {
  if (question.questionType !== "text") return false;
  const config = toRecord(question.config);
  return config.textMode === "short" || config.inputMode === "short" || (config.multiline === false && !Array.isArray(config.options));
}

export function isChoiceTextQuestion(question: Question): boolean {
  if (question.questionType !== "text") return false;
  const config = toRecord(question.config);
  return Array.isArray(config.options) || config.textMode === "choice_text" || config.inputMode === "choice_text";
}

export function getChoiceOptions(source: Question | QuestionConfig): ChoiceOption[] {
  const config = "config" in Object(source) ? toRecord((source as Question).config) : toRecord(source);
  const rawOptions = getRawOptions(config);
  return rawOptions
    .map((option, index) => normalizeChoiceOption(option, index))
    .filter((option): option is ChoiceOption => Boolean(option));
}

export function getExperienceFallbackOptions(): ChoiceOption[] {
  return [
    { value: "yes", labelKo: "예", labelEn: "Yes" },
    { value: "no", labelKo: "아니오", labelEn: "No" },
    { value: "unknown", labelKo: "잘 모르겠음", labelEn: "Not sure" },
  ];
}

export function getScaleBounds(question: Question): { min: number; max: number } {
  const config = toRecord(question.config);
  return {
    min: getNumber(config.scaleMin) ?? 1,
    max: getNumber(config.scaleMax) ?? 5,
  };
}

export function getScaleLabels(question: Question, locale: Locale): string[] {
  const config = toRecord(question.config);
  return getStringArray(locale === "en" ? config.labelsEn : config.labelsKo);
}

export function getMaxSelect(question: Question): number | undefined {
  return getNumber(toRecord(question.config).maxSelect);
}

export function getMaxTags(question: Question): number {
  return getNumber(toRecord(question.config).maxTags) ?? 3;
}

export function getTagTypes(question: Question): string[] {
  return getStringArray(toRecord(question.config).tagTypes);
}

export function getLocalizedTagTypeOptions(question: Question, locale: Locale): ChoiceOption[] {
  const config = toRecord(question.config);
  const tagTypes = getStringArray(config.tagTypes);
  const tagTypesEn = getStringArray(config.tagTypesEn);
  return tagTypes.map((tagType, index) => ({
    value: tagType,
    labelKo: tagType,
    ...(tagTypesEn[index] ? { labelEn: tagTypesEn[index] } : {}),
  }));
}

export function getConfiguredAssetId(question: Question): string | undefined {
  const config = toRecord(question.config);
  return getString(config.assetId) ?? getString(config.asset_id);
}

export function resolveQuestionAsset(question: Question, assets: readonly SurveyAsset[], section?: SurveySection): SurveyAsset | undefined {
  const assetId = getConfiguredAssetId(question);
  if (assetId) return assets.find((item) => item.id === assetId);
  return assets.find((item) => item.questionId === question.id) ?? (section ? assets.find((item) => item.sectionId === section.id) : undefined);
}

export function getAssetUrl(asset: SurveyAsset | undefined): string | undefined {
  if (!asset) return undefined;
  return getString(asset.metadata.signedUrl) ?? getString(asset.metadata.publicUrl) ?? getString(asset.metadata.public_url) ?? getString(asset.metadata.url);
}

export function ratioFromPoint(offset: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(1, Math.max(0, offset / total));
}

export function shouldShowQuestion(args: { question: Question; questions: readonly Question[]; values: AnswerMap }): boolean {
  const rules = getVisibilityRules(args.question);
  if (!rules.length) return true;
  return rules.every((rule) => evaluateVisibilityRule(rule, args.questions, args.values));
}

export function isAnsweredValue(question: Question, value: unknown): boolean {
  if (value === undefined || value === null || value === "") return false;
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value === "string") return Boolean(value.trim());
  if (Array.isArray(value)) return value.length > 0;
  if (!isRecord(value)) return true;

  const kind = getQuestionKind(question);
  if (kind === "choice_text") return Boolean(getString(value.choiceValue) || getString(value.text));
  if (kind === "multi_select") return getStringArray(value.selectedOptions).length > 0;
  if (kind === "ranking") return Array.isArray(value.rankedOptions) && value.rankedOptions.length > 0;
  if (kind === "text" || kind === "short_text") return Boolean(getString(value.textValue));
  if (question.questionType === "image_tag") return Array.isArray(value.tags) ? value.tags.length > 0 : Array.isArray(value.points) && value.points.length > 0;
  if (question.questionType === "participant_image_tag") {
    const points = Array.isArray(value.tags) ? value.tags : value.points;
    return Boolean(value.image && Array.isArray(points) && points.length > 0);
  }
  if (question.questionType === "experience") return Boolean(value.experienceStatus);
  if (question.questionType === "profile") return Object.values(value).some((item) => typeof item === "string" && item.trim());
  if (question.questionType === "scale") return getNumber(value.scoreValue) !== undefined;
  return Object.keys(value).length > 0;
}

export function findMissingRequiredQuestions(questions: readonly Question[], values: AnswerMap): Question[] {
  return questions.filter((question) => question.isRequired && !isAnsweredValue(question, values[question.id]));
}

function getRawOptions(config: JsonRecord): unknown[] {
  if (Array.isArray(config.options)) return config.options;
  if (Array.isArray(config.choices)) return config.choices;
  if (Array.isArray(config.items)) return config.items;
  return [];
}

function normalizeChoiceOption(option: unknown, index: number): ChoiceOption | undefined {
  if (typeof option === "string" && option.trim()) {
    return { value: option.trim(), labelKo: option.trim() };
  }
  if (!isRecord(option)) return undefined;

  const label = option.label;
  const value =
    getString(option.value) ??
    getString(option.id) ??
    getString(option.key) ??
    getString(option.code) ??
    getString(option.optionValue) ??
    `option_${index + 1}`;
  const labelKo =
    getString(option.labelKo) ??
    getString(option.label_ko) ??
    (isRecord(label) ? getString(label.ko) : undefined) ??
    getString(label) ??
    value;
  const labelEn = getString(option.labelEn) ?? getString(option.label_en) ?? (isRecord(label) ? getString(label.en) : undefined);
  return labelEn ? { value, labelKo, labelEn } : { value, labelKo };
}

function getVisibilityRules(question: Question): JsonRecord[] {
  const config = toRecord(question.config);
  const branch = isRecord(config.branch) ? config.branch : undefined;
  const visibility = isRecord(config.visibility) ? config.visibility : undefined;
  const legacy = config.visibleWhen ?? config.visible_when ?? config.condition ?? config.dependsOn ?? config.depends_on;
  const candidates = [
    branch?.when,
    visibility?.when,
    Array.isArray(branch?.rules) ? branch?.rules : undefined,
    Array.isArray(visibility?.rules) ? visibility?.rules : undefined,
    legacy,
  ];

  const rules: JsonRecord[] = [];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      rules.push(...candidate.filter(isRecord));
    } else if (isRecord(candidate)) {
      rules.push(candidate);
    }
  }
  return rules;
}

function evaluateVisibilityRule(rule: JsonRecord, questions: readonly Question[], values: AnswerMap): boolean {
  const sourceKey = getString(rule.questionKey) ?? getString(rule.question_key) ?? getString(rule.sourceQuestionKey);
  if (!sourceKey) return true;
  const sourceQuestion = questions.find((item) => item.questionKey === sourceKey || item.id === sourceKey);
  if (!sourceQuestion) return false;

  const actual = normalizeComparableValue(values[sourceQuestion.id] ?? values[sourceQuestion.questionKey] ?? values[sourceKey]);
  const expected = rule.value ?? rule.equals ?? rule.expectedValue ?? rule.expected_value;
  const operator = getString(rule.operator) ?? (Array.isArray(expected) ? "in" : "eq");
  return compareValues(actual, expected, operator);
}

function normalizeComparableValue(value: unknown): unknown {
  if (isRecord(value)) {
    return value.choiceValue ?? value.scoreValue ?? value.value ?? value.experienceStatus ?? value.textValue ?? value.text;
  }
  return value;
}

function compareValues(actual: unknown, expected: JsonValue | undefined, operator: string): boolean {
  if (operator === "neq") return String(actual) !== String(expected);
  if (operator === "in") return Array.isArray(expected) ? expected.some((item) => String(item) === String(actual)) : String(actual) === String(expected);
  if (operator === "not_in") return Array.isArray(expected) ? expected.every((item) => String(item) !== String(actual)) : String(actual) !== String(expected);

  if (operator === "lt" || operator === "lte" || operator === "gt" || operator === "gte") {
    const actualNumber = typeof actual === "number" ? actual : Number(actual);
    const expectedNumber = typeof expected === "number" ? expected : Number(expected);
    if (!Number.isFinite(actualNumber) || !Number.isFinite(expectedNumber)) return false;
    if (operator === "lt") return actualNumber < expectedNumber;
    if (operator === "lte") return actualNumber <= expectedNumber;
    if (operator === "gt") return actualNumber > expectedNumber;
    return actualNumber >= expectedNumber;
  }

  if (Array.isArray(actual)) return actual.some((item) => String(item) === String(expected));
  return String(actual) === String(expected);
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
