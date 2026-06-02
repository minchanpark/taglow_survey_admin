import type { AnalysisFilters, HeatmapFilters, IdentityResponseFilters, JsonRecord, TextAnswerFilters } from "../../model";
import type { GroupCompareFilters } from "../../model/analysis";

export function toAnalysisFilterPayload(filters: AnalysisFilters | HeatmapFilters | TextAnswerFilters | IdentityResponseFilters | GroupCompareFilters): JsonRecord {
  return {
    gender: filters.gender ?? null,
    semester_group: filters.semesterGroup ?? null,
    department: filters.department ?? null,
    rc: filters.rc ?? null,
    dormitory: filters.dormitory ?? null,
    room_type: filters.roomType ?? null,
    dorm_experience: filters.dormExperience ?? null,
    section_id: filters.sectionId ?? null,
    topic_key: filters.topicKey ?? null,
    space_key: filters.spaceKey ?? null,
    asset_id: "assetId" in filters ? filters.assetId ?? null : null,
    tag_type: "tagType" in filters ? filters.tagType ?? null : null,
    keyword: "keyword" in filters ? filters.keyword ?? null : null,
    cursor: "cursor" in filters ? filters.cursor ?? null : null,
    limit: "limit" in filters ? filters.limit ?? null : null,
    group_by: "groupBy" in filters ? toGroupByColumn(filters.groupBy) : null,
    target_kind: "targetKind" in filters ? filters.targetKind ?? null : null,
    target_id: "targetId" in filters ? filters.targetId ?? null : null,
    metric_type: "metricType" in filters ? filters.metricType ?? null : null,
  };
}

function toGroupByColumn(value: GroupCompareFilters["groupBy"] | undefined): string | null {
  if (!value) return null;
  if (value === "semesterGroup") return "semester_group";
  if (value === "roomType") return "room_type";
  if (value === "dormExperience") return "dorm_experience";
  return value;
}
