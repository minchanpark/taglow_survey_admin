import type { AnalysisFilters, FilterOptions, GroupCompareDimension } from "./analysis";
import type { ChoiceOption, Question } from "./question";

export type CanonicalProfileFilterKey = "gender" | "semesterGroup" | "department" | "rc" | "roomType" | "dormitory";

export type ProfileDistributionKey = CanonicalProfileFilterKey | "dormExperience";

export type ProfileOption = Readonly<{
  value: string;
  label: string;
}>;

export type ProfileFilterDefinition = Readonly<{
  key: ProfileDistributionKey;
  profileField: string;
  label: string;
  options: ProfileOption[];
  questionId: string;
  questionKey: string;
  orderIndex: number;
}>;

export const semesterGroupOptions = ["1학기", "2학기", "3학기", "4학기", "5학기이상"] as const;

export const genderOptions = ["남성", "여성"] as const;

export const departmentOptions = [
  "AI컴퓨터전자공학부",
  "콘텐츠융합디자인학부",
  "법학부",
  "AI융합학부",
  "경영경제학부",
  "국제어문학부",
  "기계제어공학부",
  "생명과학부",
  "공간환경시스템공학부",
  "커뮤니케이션학부",
  "상담심리사회복지학부",
  "글로벌리더십학부(1학년)",
] as const;

export const rcOptions = ["토레이RC", "장기려RC", "손양원RC", "열송학사RC", "카이퍼RC", "카마이클RC"] as const;

export const roomTypeOptions = ["1인실", "2인실", "3인실", "4인실"] as const;

export const dormitoryOptions = ["비전관", "은혜관", "로뎀관", "벧엘관", "하용조관", "국제관"] as const;

export const canonicalProfileOptionLists: Record<CanonicalProfileFilterKey, readonly string[]> = {
  gender: genderOptions,
  semesterGroup: semesterGroupOptions,
  department: departmentOptions,
  rc: rcOptions,
  roomType: roomTypeOptions,
  dormitory: dormitoryOptions,
};

export const profileFilterLabels: Record<ProfileDistributionKey, string> = {
  gender: "성별",
  semesterGroup: "학기",
  department: "학부",
  rc: "소속 RC",
  dormitory: "거주 생활관",
  roomType: "인실",
  dormExperience: "거주 경험",
};

export function toChoiceOptions(values: readonly string[]): ChoiceOption[] {
  return values.map((value) => ({ value, labelKo: value }));
}

export function normalizeProfileFilterKey(value: unknown): ProfileDistributionKey | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  if (!normalized) return undefined;
  if (normalized === "gender") return "gender";
  if (normalized === "semester" || normalized === "semester_group" || normalized === "semesterGroup") return "semesterGroup";
  if (normalized === "department") return "department";
  if (normalized === "rc") return "rc";
  if (normalized === "dormitory") return "dormitory";
  if (normalized === "room_type" || normalized === "roomType") return "roomType";
  if (normalized === "dorm_experience" || normalized === "dormExperience") return "dormExperience";
  return undefined;
}

export function toProfileFieldValue(key: ProfileDistributionKey): string {
  if (key === "semesterGroup") return "semester_group";
  if (key === "roomType") return "room_type";
  if (key === "dormExperience") return "dorm_experience";
  return key;
}

export function getAnalysisFilterValue(filters: AnalysisFilters, key: ProfileDistributionKey): string | undefined {
  return filters[key as keyof AnalysisFilters];
}

export function withAnalysisFilterValue(filters: AnalysisFilters, key: ProfileDistributionKey, value: string | undefined): AnalysisFilters {
  return { ...filters, [key]: value || undefined };
}

export function buildProfileFilterDefinitions(questions: readonly Question[]): ProfileFilterDefinition[] {
  const definitions = new Map<ProfileDistributionKey, ProfileFilterDefinition>();
  const profileQuestions = questions
    .filter((question) => question.questionType === "profile")
    .sort((a, b) => a.orderIndex - b.orderIndex);

  for (const question of profileQuestions) {
    const config = asRecord(question.config);
    const key = normalizeProfileFilterKey(config.profileField);
    if (!key || definitions.has(key)) continue;
    const options = normalizeProfileOptions(config.options);
    if (!options.length) continue;
    definitions.set(key, {
      key,
      profileField: getString(config.profileField) ?? toProfileFieldValue(key),
      label: question.title.ko || profileFilterLabels[key],
      options,
      questionId: question.id,
      questionKey: question.questionKey,
      orderIndex: question.orderIndex,
    });
  }

  return [...definitions.values()];
}

export function buildFilterOptionsFromQuestions(questions: readonly Question[]): FilterOptions {
  const definitions = buildProfileFilterDefinitions(questions);
  const valuesFor = (key: ProfileDistributionKey) => definitions.find((definition) => definition.key === key)?.options.map((option) => option.value) ?? [];
  return {
    genders: valuesFor("gender"),
    semesterGroups: valuesFor("semesterGroup"),
    departments: valuesFor("department"),
    rcs: valuesFor("rc"),
    dormitories: valuesFor("dormitory"),
    roomTypes: valuesFor("roomType"),
    dormExperiences: valuesFor("dormExperience"),
  };
}

export function mergeProfileFilterDefinitionsWithOptions(
  definitions: readonly ProfileFilterDefinition[],
  filterOptions: FilterOptions | undefined,
): ProfileFilterDefinition[] {
  if (!filterOptions) return [...definitions];

  const optionsByKey: Record<ProfileDistributionKey, readonly string[]> = {
    gender: filterOptions.genders,
    semesterGroup: filterOptions.semesterGroups,
    department: filterOptions.departments,
    rc: filterOptions.rcs,
    dormitory: filterOptions.dormitories,
    roomType: filterOptions.roomTypes,
    dormExperience: filterOptions.dormExperiences,
  };

  return definitions.map((definition) => {
    const optionValues = optionsByKey[definition.key].filter((value) => value.trim());
    if (!optionValues.length) return definition;

    const configuredOptions = new Map(definition.options.map((option) => [option.value, option] as const));
    const mergedOptions = optionValues.map((value) => configuredOptions.get(value) ?? { value, label: value });
    return {
      ...definition,
      options: mergedOptions,
    };
  });
}

export function getGroupCompareDefinitions(
  definitions: readonly ProfileFilterDefinition[],
): Array<ProfileFilterDefinition & { key: GroupCompareDimension }> {
  return definitions.filter((definition): definition is ProfileFilterDefinition & { key: GroupCompareDimension } => isGroupCompareDimension(definition.key));
}

export function pruneAnalysisFilters(filters: AnalysisFilters, definitions: readonly ProfileFilterDefinition[]): AnalysisFilters {
  const allowed = new Map(definitions.map((definition) => [definition.key, new Set(definition.options.map((option) => option.value))] as const));
  const next: AnalysisFilters = {};
  const passthroughKeys = ["sectionId", "topicKey", "spaceKey"] as const;

  for (const definition of definitions) {
    const value = getAnalysisFilterValue(filters, definition.key);
    if (value && allowed.get(definition.key)?.has(value)) {
      Object.assign(next, { [definition.key]: value });
    }
  }

  for (const key of passthroughKeys) {
    const value = filters[key];
    if (value) Object.assign(next, { [key]: value });
  }

  return next;
}

export function areAnalysisFiltersEqual(left: AnalysisFilters, right: AnalysisFilters): boolean {
  const leftEntries = Object.entries(left).filter(([, value]) => typeof value === "string" && value.trim());
  const rightEntries = Object.entries(right).filter(([, value]) => typeof value === "string" && value.trim());
  if (leftEntries.length !== rightEntries.length) return false;
  return leftEntries.every(([key, value]) => right[key as keyof AnalysisFilters] === value);
}

function normalizeProfileOptions(value: unknown): ProfileOption[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const options: ProfileOption[] = [];

  for (const item of value) {
    const record = asRecord(item);
    const optionValue = getString(record.value) ?? getString(record.labelKo) ?? getString(record.label) ?? getString(record.labelEn);
    if (!optionValue || seen.has(optionValue)) continue;
    seen.add(optionValue);
    options.push({
      value: optionValue,
      label: getString(record.labelKo) ?? getString(record.label) ?? getString(record.labelEn) ?? optionValue,
    });
  }

  return options;
}

function isGroupCompareDimension(key: ProfileDistributionKey): key is GroupCompareDimension {
  return (
    key === "gender" ||
    key === "semesterGroup" ||
    key === "department" ||
    key === "rc" ||
    key === "dormitory" ||
    key === "roomType" ||
    key === "dormExperience"
  );
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function getString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
