import {
  compactLocalizedText,
  type AdminMember,
  type AdminRole,
  type BorichResult,
  type ChoiceDistribution,
  type FilterOptions,
  type GroupCompareResult,
  type HeatmapPoint,
  type ImageTagAnswer,
  type IdentityResponse,
  type JsonRecord,
  type LocusPoint,
  type LocusQuadrant,
  type MetricType,
  type PriorityIssue,
  type Question,
  type QuestionSummary,
  type ResponseSummary,
  type QuestionType,
  type SectionSummary,
  type SectionType,
  type Survey,
  type SurveyAsset,
  type SurveyAssetType,
  type SurveyAccessRole,
  type SurveyCollaborator,
  type SurveyCollaboratorRole,
  type SurveySection,
  type SurveyStatus,
  type TextAnswer,
  type TextGroup,
} from "../../model";
import type {
  RawAdminMember,
  RawBorichResult,
  RawChoiceDistribution,
  RawFilterOptions,
  RawGroupCompareResult,
  RawHeatmapPoint,
  RawImageTagAnswer,
  RawIdentityResponse,
  RawLocusPoint,
  RawPriorityIssue,
  RawQuestion,
  RawQuestionSummary,
  RawResponseSummary,
  RawSection,
  RawSectionSummary,
  RawSurvey,
  RawSurveyAsset,
  RawSurveyCollaborator,
  RawTextAnswer,
  RawTextGroup,
} from "../gateway/rawTypes";

export class AdminPayloadMapper {
  toAdminMember(row: RawAdminMember): AdminMember {
    return {
      id: row.id,
      userId: row.user_id,
      email: row.email,
      role: normalizeAdminRole(row.role),
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  toSurvey(row: RawSurvey): Survey {
    return {
      id: row.id,
      title: compactLocalizedText(row.title, row.title_en),
      description: row.description || row.description_en ? compactLocalizedText(row.description ?? "", row.description_en) : undefined,
      status: normalizeSurveyStatus(row.status),
      publicSlug: row.public_slug ?? undefined,
      publicCode: row.public_code ?? undefined,
      versionGroupId: row.version_group_id,
      versionNumber: row.version_number,
      parentSurveyId: row.parent_survey_id ?? undefined,
      isLatestVersion: row.is_latest_version,
      settings: normalizeRecord(row.settings),
      createdBy: row.created_by,
      startsAt: row.starts_at ?? undefined,
      endsAt: row.ends_at ?? undefined,
      publishedAt: row.published_at ?? undefined,
      closedAt: row.closed_at ?? undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      accessRole: normalizeSurveyAccessRole(row.access_role),
    };
  }

  toSurveyCollaborator(row: RawSurveyCollaborator): SurveyCollaborator {
    return {
      id: row.id,
      surveyId: row.survey_id,
      email: row.email,
      role: normalizeSurveyCollaboratorRole(row.role),
      invitedBy: row.invited_by ?? undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      revokedAt: row.revoked_at ?? undefined,
    };
  }

  toSection(row: RawSection): SurveySection {
    return {
      id: row.id,
      surveyId: row.survey_id,
      sectionKey: row.section_key,
      title: compactLocalizedText(row.title_ko, row.title_en),
      description: row.description_ko ? compactLocalizedText(row.description_ko, row.description_en) : undefined,
      orderIndex: row.order_index,
      sectionType: normalizeSectionType(row.section_type),
      settings: normalizeRecord(row.settings),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  toQuestion(row: RawQuestion): Question {
    return {
      id: row.id,
      surveyId: row.survey_id,
      sectionId: row.section_id,
      questionKey: row.question_key,
      questionType: normalizeQuestionType(row.question_type),
      title: compactLocalizedText(row.title_ko, row.title_en),
      description: row.description_ko ? compactLocalizedText(row.description_ko, row.description_en) : undefined,
      orderIndex: row.order_index,
      isRequired: row.is_required,
      metricType: normalizeMetricType(row.metric_type),
      topicKey: row.topic_key ?? undefined,
      spaceKey: row.space_key ?? undefined,
      config: normalizeRecord(row.config),
      validation: normalizeRecord(row.validation),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  toAsset(row: RawSurveyAsset): SurveyAsset {
    return {
      id: row.id,
      surveyId: row.survey_id,
      sectionId: row.section_id ?? undefined,
      questionId: row.question_id ?? undefined,
      assetType: normalizeAssetType(row.asset_type),
      storageBucket: row.storage_bucket,
      storagePath: row.storage_path,
      metadata: normalizeRecord(row.metadata),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  toFilterOptions(row: RawFilterOptions): FilterOptions {
    return {
      genders: normalizeStringArray(row.genders),
      semesterGroups: normalizeStringArray(row.semester_groups),
      departments: normalizeStringArray(row.departments),
      rcs: normalizeStringArray(row.rcs),
      dormitories: normalizeStringArray(row.dormitories),
      roomTypes: normalizeStringArray(row.room_types),
      dormExperiences: normalizeStringArray(row.dorm_experiences),
    };
  }

  toResponseSummary(row: RawResponseSummary): ResponseSummary {
    const threshold = Number(row.low_sample_threshold ?? 10);
    const filteredResponses = Number(row.filtered_responses ?? 0);
    return {
      totalResponses: Number(row.total_responses ?? 0),
      submittedResponses: Number(row.submitted_responses ?? 0),
      filteredResponses,
      lowSampleThreshold: threshold,
      isLowSample: Boolean(row.is_low_sample ?? (filteredResponses > 0 && filteredResponses < threshold)),
      profileDistribution: normalizeProfileDistribution(row.profile_distribution),
      lowSampleGroups: normalizeLowSampleGroups(row.low_sample_groups),
    };
  }

  toSectionSummary(row: RawSectionSummary): SectionSummary {
    return {
      sectionId: row.section_id,
      sectionTitle: row.section_title ?? "Untitled section",
      averageScore: row.avg_score ?? row.average_score ?? null,
      n: row.n,
    };
  }

  toQuestionSummary(row: RawQuestionSummary): QuestionSummary {
    return {
      questionId: row.question_id,
      questionTitle: row.question_title ?? "제목 없는 질문",
      sectionId: row.section_id ?? undefined,
      sectionTitle: row.section_title ?? undefined,
      topicKey: row.topic_key ?? undefined,
      metricType: normalizeMetricType(row.metric_type),
      averageScore: row.avg_score ?? row.average_score ?? null,
      standardDeviation: row.stddev_score ?? row.standard_deviation ?? (Number(row.n ?? 0) === 1 ? 0 : null),
      n: row.n,
    };
  }

  toChoiceDistribution(row: RawChoiceDistribution): ChoiceDistribution {
    return {
      questionId: row.question_id,
      questionTitle: row.question_title ?? "제목 없는 질문",
      sectionId: row.section_id ?? undefined,
      sectionTitle: row.section_title ?? undefined,
      optionValue: row.option_value ?? "unknown",
      optionLabel: row.option_label ?? row.option_value ?? "미분류",
      count: Number(row.count ?? 0),
      n: Number(row.n ?? 0),
      percentage: Number(row.percentage ?? 0),
    };
  }

  toGroupCompareResult(row: RawGroupCompareResult): GroupCompareResult {
    return {
      groupKey: row.group_key ?? "unclassified",
      groupLabel: row.group_label ?? row.group_key ?? "기타/미분류",
      averageScore: row.avg_score ?? row.average_score ?? null,
      n: Number(row.n ?? 0),
      isHighest: Boolean(row.is_highest),
      isLowest: Boolean(row.is_lowest),
      isLowSample: Boolean(row.is_low_sample),
    };
  }

  toPriorityIssue(row: RawPriorityIssue): PriorityIssue {
    return {
      id: row.id ?? row.topic_key ?? row.label ?? "priority",
      label: row.label ?? row.topic_key ?? "분류 없음",
      source: normalizePrioritySource(row.source),
      topicKey: row.topic_key ?? undefined,
      sectionTitle: row.section_title ?? undefined,
      averageImportance: row.avg_importance ?? row.average_importance ?? null,
      averageSatisfaction: row.avg_satisfaction ?? row.average_satisfaction ?? null,
      gap: row.avg_gap ?? row.gap ?? null,
      borichScore: row.borich_score,
      textCount: Number(row.text_count ?? 0),
      tagCount: Number(row.tag_count ?? 0),
      n: Number(row.n ?? 0),
    };
  }

  toBorichResult(row: RawBorichResult): BorichResult {
    return {
      topicKey: row.topic_key,
      averageImportance: row.avg_importance ?? row.average_importance ?? null,
      averageSatisfaction: row.avg_satisfaction ?? row.average_satisfaction ?? null,
      gap: row.avg_gap ?? row.gap ?? null,
      borichScore: row.borich_score,
      n: row.n,
    };
  }

  toLocusPoint(row: RawLocusPoint): LocusPoint {
    return {
      topicKey: row.topic_key,
      label: row.label ?? row.topic_key,
      averageImportance: row.avg_importance ?? row.average_importance ?? null,
      averageSatisfaction: row.avg_satisfaction ?? row.average_satisfaction ?? null,
      gap: row.avg_gap ?? row.gap ?? null,
      n: Number(row.n ?? 0),
      quadrant: normalizeLocusQuadrant(row.quadrant),
    };
  }

  toHeatmapPoint(row: RawHeatmapPoint): HeatmapPoint {
    return {
      id: row.answer_id,
      assetId: row.asset_id ?? undefined,
      xRatio: Number(row.x_ratio ?? 0),
      yRatio: Number(row.y_ratio ?? 0),
      tagType: row.tag_type ?? undefined,
      severity: row.severity ?? undefined,
      textValue: row.text_value ?? undefined,
      responseProfile: row.response_profile ?? compactRecord({
        dormitory: row.dormitory,
        roomType: row.room_type,
        rc: row.rc,
      }),
    };
  }

  toImageTagAnswer(row: RawImageTagAnswer): ImageTagAnswer {
    const questionType = row.question_type === "participant_image_tag" ? "participant_image_tag" : "image_tag";
    const source = questionType === "participant_image_tag" ? "participant_upload" : "survey_asset";
    return {
      id: row.id ?? row.answer_id ?? "",
      responseId: row.response_id,
      sectionId: row.section_id ?? undefined,
      sectionTitle: row.section_title ?? undefined,
      questionId: row.question_id ?? undefined,
      questionTitle: row.question_title ?? "제목 없는 태깅 질문",
      questionType,
      kind: questionType === "participant_image_tag" ? "participant_upload" : "admin_image",
      assetId: row.asset_id ?? undefined,
      image: compactImage({
        assetId: row.asset_id,
        storageBucket: row.image_storage_bucket,
        storagePath: row.image_storage_path,
        signedUrl: row.image_signed_url,
        source,
      }),
      xRatio: clampRatio(row.x_ratio),
      yRatio: clampRatio(row.y_ratio),
      tagType: row.tag_type ?? undefined,
      severity: row.severity ?? undefined,
      textValue: row.text_value ?? undefined,
      valueJson: normalizeRecord(row.value_json),
      responseProfile: row.response_profile ?? compactRecord({
        dormitory: row.dormitory,
        roomType: row.room_type,
        rc: row.rc,
        department: row.department,
      }),
      createdAt: row.created_at,
    };
  }

  toTextAnswer(row: RawTextAnswer): TextAnswer {
    return {
      id: row.id ?? row.answer_id ?? "",
      responseId: row.response_id,
      sectionId: row.section_id ?? undefined,
      questionId: row.question_id ?? undefined,
      topicKey: row.topic_key ?? undefined,
      spaceKey: row.space_key ?? undefined,
      textValue: row.text_value ?? "",
      valueJson: normalizeRecord(row.value_json),
      profile: row.profile ?? compactRecord({
        dormitory: row.dormitory,
        roomType: row.room_type,
        rc: row.rc,
        department: row.department,
      }),
      createdAt: row.created_at,
    };
  }

  toTextGroup(row: RawTextGroup): TextGroup {
    return {
      groupKey: row.group_key ?? row.topic_key ?? row.question_id ?? "unclassified",
      label: row.label ?? row.group_key ?? "기타/미분류",
      topicKey: row.topic_key ?? undefined,
      issueType: row.issue_type ?? undefined,
      questionId: row.question_id ?? undefined,
      count: Number(row.count ?? 0),
      n: Number(row.n ?? row.count ?? 0),
      representativeTexts: normalizeStringArray(row.representative_texts),
    };
  }

  toIdentityResponse(row: RawIdentityResponse): IdentityResponse {
    return {
      responseId: row.response_id,
      studentNumber: row.student_number ?? undefined,
      name: row.name ?? undefined,
      profile: row.profile ?? compactRecord({
        gender: row.gender,
        semesterGroup: row.semester_group,
        department: row.department,
        rc: row.rc,
        dormitory: row.dormitory,
        roomType: row.room_type,
        dormExperience: row.dorm_experience,
      }),
      submittedAt: row.submitted_at,
    };
  }
}

function normalizeProfileDistribution(value: JsonRecord | null | undefined): ResponseSummary["profileDistribution"] {
  return {
    gender: normalizeDistributionItems(value?.gender),
    semesterGroup: normalizeDistributionItems(value?.semesterGroups ?? value?.semester_groups),
    department: normalizeDistributionItems(value?.department ?? value?.departments),
    rc: normalizeDistributionItems(value?.rc ?? value?.rcs),
    dormitory: normalizeDistributionItems(value?.dormitory ?? value?.dormitories),
    roomType: normalizeDistributionItems(value?.roomType ?? value?.room_type ?? value?.roomTypes ?? value?.room_types),
    dormExperience: normalizeDistributionItems(value?.dormExperience ?? value?.dorm_experience ?? value?.dormExperiences ?? value?.dorm_experiences),
  };
}

function normalizeDistributionItems(value: unknown): ResponseSummary["profileDistribution"]["gender"] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(isRecord)
    .map((item) => ({
      key: getString(item.key) ?? getString(item.label) ?? "unclassified",
      label: getString(item.label) ?? getString(item.key) ?? "기타/미분류",
      n: getFiniteNumber(item.n) ?? 0,
      percentage: getFiniteNumber(item.percentage) ?? 0,
      isUnclassified: Boolean(item.isUnclassified ?? item.is_unclassified),
    }));
}

function normalizeLowSampleGroups(value: unknown): ResponseSummary["lowSampleGroups"] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(isRecord)
    .map((item) => ({
      dimension: normalizeProfileDimension(getString(item.dimension)),
      label: getString(item.label) ?? "기타/미분류",
      n: getFiniteNumber(item.n) ?? 0,
    }));
}

function normalizeProfileDimension(value: string | undefined): ResponseSummary["lowSampleGroups"][number]["dimension"] {
  if (
    value === "gender" ||
    value === "semesterGroup" ||
    value === "department" ||
    value === "rc" ||
    value === "dormitory" ||
    value === "roomType" ||
    value === "dormExperience"
  ) {
    return value;
  }
  if (value === "semester_group") return "semesterGroup";
  if (value === "room_type") return "roomType";
  if (value === "dorm_experience") return "dormExperience";
  return "dormitory";
}

function normalizePrioritySource(value: string | null | undefined): PriorityIssue["source"] {
  if (value === "borich" || value === "low_satisfaction" || value === "text" || value === "heatmap" || value === "mixed") return value;
  return "mixed";
}

function normalizeLocusQuadrant(value: string | null | undefined): LocusQuadrant {
  if (value === "top_priority" || value === "maintain_strengthen" || value === "gradual_improvement" || value === "maintain") return value;
  return "maintain";
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function getFiniteNumber(value: unknown): number | undefined {
  const numberValue = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(numberValue) ? numberValue : undefined;
}

function compactImage(value: {
  assetId?: string | null;
  storageBucket?: string | null;
  storagePath?: string | null;
  signedUrl?: string | null;
  source: "survey_asset" | "participant_upload";
}): ImageTagAnswer["image"] {
  if (!value.assetId && !value.storageBucket && !value.storagePath && !value.signedUrl) return undefined;
  return {
    assetId: value.assetId ?? undefined,
    storageBucket: value.storageBucket ?? undefined,
    storagePath: value.storagePath ?? undefined,
    signedUrl: value.signedUrl ?? undefined,
    source: value.source,
  };
}

function clampRatio(value: number | null | undefined): number {
  const ratio = Number(value ?? 0);
  if (!Number.isFinite(ratio)) return 0;
  return Math.min(1, Math.max(0, ratio));
}

function normalizeRecord(value: JsonRecord | null | undefined): JsonRecord {
  return value ?? {};
}

function compactRecord(value: Record<string, string | number | boolean | null | undefined>): JsonRecord | undefined {
  const entries = Object.entries(value).filter(([, item]) => item !== null && item !== undefined && item !== "");
  return entries.length ? (Object.fromEntries(entries) as JsonRecord) : undefined;
}

function normalizeStringArray(value: string[] | null | undefined): string[] {
  return (value ?? []).filter(Boolean);
}

function normalizeAdminRole(value: string): AdminRole {
  if (value === "super_admin" || value === "super-admin" || value === "owner") return "super_admin";
  if (value === "admin" || value === "viewer") return value;
  return "viewer";
}

function normalizeSurveyStatus(value: string): SurveyStatus {
  if (value === "draft" || value === "published" || value === "closed" || value === "archived") return value;
  return "draft";
}

function normalizeSurveyAccessRole(value: string | null | undefined): SurveyAccessRole {
  if (value === "manager" || value === "editor" || value === "viewer") return value;
  return "owner";
}

function normalizeSurveyCollaboratorRole(value: string): SurveyCollaboratorRole {
  if (value === "manager" || value === "editor") return value;
  return "viewer";
}

function normalizeSectionType(value: string): SectionType {
  const allowed: SectionType[] = [
    "intro",
    "general",
    "profile",
    "facility",
    "laundry",
    "global_lounge",
    "identity",
    "completion",
    "satisfaction",
    "space_tagging",
    "free_text",
    "submitter",
  ];
  return allowed.includes(value as SectionType) ? (value as SectionType) : "general";
}

function normalizeQuestionType(value: string): QuestionType {
  const allowed: QuestionType[] = [
    "profile",
    "experience",
    "scale",
    "single_choice",
    "multi_select",
    "matrix_multi_select",
    "ranking",
    "text",
    "image_tag",
    "participant_image_tag",
    "attention_check",
  ];
  return allowed.includes(value as QuestionType) ? (value as QuestionType) : "text";
}

function normalizeMetricType(value: string | null): MetricType {
  if (value === "satisfaction" || value === "importance" || value === "experience") return value;
  return "none";
}

function normalizeAssetType(value: string): SurveyAssetType {
  if (value === "image" || value === "export" || value === "attachment") return value;
  return "attachment";
}
