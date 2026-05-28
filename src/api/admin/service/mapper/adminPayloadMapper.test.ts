import { describe, expect, it } from "vitest";
import type { RawSurvey } from "../gateway/rawTypes";
import { AdminPayloadMapper } from "./adminPayloadMapper";

describe("AdminPayloadMapper analysis RPC rows", () => {
  const mapper = new AdminPayloadMapper();

  it("maps public slug and public code without exposing internal id as the public route", () => {
    const row: RawSurvey = {
      id: "survey-1",
      title: "생활관 만족도 조사",
      description: null,
      status: "draft",
      public_slug: "handong-dorm-2026",
      public_code: "8K2PQA",
      version_group_id: "version-group-1",
      version_number: 1,
      parent_survey_id: null,
      is_latest_version: true,
      settings: null,
      created_by: "user-1",
      published_at: null,
      closed_at: null,
      created_at: "2026-05-28T00:00:00.000Z",
      updated_at: "2026-05-28T00:00:00.000Z",
    };

    expect(mapper.toSurvey(row)).toMatchObject({
      id: "survey-1",
      publicSlug: "handong-dorm-2026",
      publicCode: "8K2PQA",
    });
  });

  it("maps current section summary RPC column names", () => {
    expect(
      mapper.toSectionSummary({
        section_id: "section-1",
        section_title: "생활관 시설",
        avg_score: 4.25,
        n: 12,
      }),
    ).toEqual({
      sectionId: "section-1",
      sectionTitle: "생활관 시설",
      averageScore: 4.25,
      n: 12,
    });
  });

  it("maps current Borich RPC column names", () => {
    expect(
      mapper.toBorichResult({
        topic_key: "laundry",
        avg_importance: 4.8,
        avg_satisfaction: 2.7,
        avg_gap: 2.1,
        borich_score: 10.08,
        n: 8,
      }),
    ).toEqual({
      topicKey: "laundry",
      averageImportance: 4.8,
      averageSatisfaction: 2.7,
      gap: 2.1,
      borichScore: 10.08,
      n: 8,
    });
  });

  it("maps heatmap RPC profile fields into a domain profile", () => {
    expect(
      mapper.toHeatmapPoint({
        answer_id: "answer-1",
        asset_id: "asset-1",
        x_ratio: 0.42,
        y_ratio: 0.68,
        tag_type: "risk",
        severity: 4,
        text_value: "환기가 약합니다.",
        dormitory: "A동",
        room_type: "2인실",
        rc: "장기려",
      }),
    ).toEqual({
      id: "answer-1",
      assetId: "asset-1",
      xRatio: 0.42,
      yRatio: 0.68,
      tagType: "risk",
      severity: 4,
      textValue: "환기가 약합니다.",
      responseProfile: {
        dormitory: "A동",
        roomType: "2인실",
        rc: "장기려",
      },
    });
  });

  it("maps text answer RPC rows without leaking participant identifiers", () => {
    expect(
      mapper.toTextAnswer({
        answer_id: "answer-1",
        section_id: "section-1",
        question_id: "question-1",
        topic_key: "facility",
        space_key: "lounge",
        text_value: "조명이 어둡습니다.",
        value_json: { category: "lighting" },
        dormitory: "A동",
        room_type: "2인실",
        rc: "장기려",
        department: "전산전자공학부",
        created_at: "2026-05-28T00:00:00.000Z",
      }),
    ).toEqual({
      id: "answer-1",
      responseId: undefined,
      sectionId: "section-1",
      questionId: "question-1",
      topicKey: "facility",
      spaceKey: "lounge",
      textValue: "조명이 어둡습니다.",
      valueJson: { category: "lighting" },
      profile: {
        dormitory: "A동",
        roomType: "2인실",
        rc: "장기려",
        department: "전산전자공학부",
      },
      createdAt: "2026-05-28T00:00:00.000Z",
    });
  });
});
