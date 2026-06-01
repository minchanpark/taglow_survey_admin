import { describe, expect, it } from "vitest";
import type { RawAdminMember, RawSurvey, RawSurveyCollaborator } from "../gateway/rawTypes";
import { AdminPayloadMapper } from "./adminPayloadMapper";

describe("AdminPayloadMapper analysis RPC rows", () => {
  const mapper = new AdminPayloadMapper();

  it("maps legacy owner role to super_admin", () => {
    const row: RawAdminMember = {
      id: "admin-member-1",
      user_id: "user-1",
      email: "itisnewdawn@gmail.com",
      role: "owner",
      is_active: true,
      created_at: "2026-05-28T00:00:00.000Z",
      updated_at: "2026-05-28T00:00:00.000Z",
    };

    expect(mapper.toAdminMember(row)).toMatchObject({
      role: "super_admin",
      isActive: true,
    });
  });

  it("maps public slug and public code without exposing internal id as the public route", () => {
    const row: RawSurvey = {
      id: "survey-1",
      title: "생활관 만족도 조사",
      description: "2026 봄학기",
      description_en: "Spring 2026",
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
      description: {
        ko: "2026 봄학기",
        en: "Spring 2026",
      },
      publicSlug: "handong-dorm-2026",
      publicCode: "8K2PQA",
      accessRole: "owner",
    });
  });

  it("maps survey access roles and collaborators into domain models", () => {
    const sharedSurvey: RawSurvey = {
      id: "survey-1",
      title: "생활관 만족도 조사",
      description: null,
      status: "draft",
      public_slug: null,
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
      access_role: "editor",
    };
    const collaborator: RawSurveyCollaborator = {
      id: "collaborator-1",
      survey_id: "survey-1",
      email: "viewer@example.com",
      role: "viewer",
      invited_by: "user-1",
      created_at: "2026-05-28T01:00:00.000Z",
      updated_at: "2026-05-28T02:00:00.000Z",
      revoked_at: null,
    };

    expect(mapper.toSurvey(sharedSurvey)).toMatchObject({
      id: "survey-1",
      accessRole: "editor",
    });
    expect(mapper.toSurveyCollaborator(collaborator)).toEqual({
      id: "collaborator-1",
      surveyId: "survey-1",
      email: "viewer@example.com",
      role: "viewer",
      invitedBy: "user-1",
      createdAt: "2026-05-28T01:00:00.000Z",
      updatedAt: "2026-05-28T02:00:00.000Z",
      revokedAt: undefined,
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

  it("maps question scale summaries for satisfaction and importance rows", () => {
    expect(
      mapper.toQuestionSummary({
        question_id: "question-importance",
        question_title: "세탁실 중요도",
        section_id: "section-1",
        section_title: "생활관 시설",
        topic_key: "laundry",
        metric_type: "importance",
        avg_score: 4.6,
        stddev_score: 0.7,
        n: 12,
      }),
    ).toEqual({
      questionId: "question-importance",
      questionTitle: "세탁실 중요도",
      sectionId: "section-1",
      sectionTitle: "생활관 시설",
      topicKey: "laundry",
      metricType: "importance",
      averageScore: 4.6,
      standardDeviation: 0.7,
      n: 12,
    });
  });

  it("keeps one-response question summaries computable when sample standard deviation is null", () => {
    expect(
      mapper.toQuestionSummary({
        question_id: "question-one-response",
        question_title: "세탁실 만족도",
        section_id: "section-1",
        section_title: "생활관 시설",
        topic_key: "laundry",
        metric_type: "satisfaction",
        avg_score: 4,
        stddev_score: null,
        n: 1,
      }),
    ).toMatchObject({
      averageScore: 4,
      standardDeviation: 0,
      n: 1,
    });
  });

  it("maps response summary distribution and low sample groups", () => {
    expect(
      mapper.toResponseSummary({
        total_responses: 20,
        submitted_responses: 18,
        filtered_responses: 4,
        low_sample_threshold: 10,
        profile_distribution: {
          semesterGroups: [{ key: "1학기", label: "1학기", n: 3, percentage: 75 }],
          dormitory: [{ key: "기타/미분류", label: "기타/미분류", n: 1, percentage: 25, isUnclassified: true }],
        },
        low_sample_groups: [{ dimension: "dormitory", label: "비전관", n: 4 }],
      }),
    ).toMatchObject({
      totalResponses: 20,
      submittedResponses: 18,
      filteredResponses: 4,
      isLowSample: true,
      profileDistribution: {
        semesterGroup: [{ key: "1학기", label: "1학기", n: 3, percentage: 75, isUnclassified: false }],
        dormitory: [{ key: "기타/미분류", label: "기타/미분류", n: 1, percentage: 25, isUnclassified: true }],
      },
      lowSampleGroups: [{ dimension: "dormitory", label: "비전관", n: 4 }],
    });
  });

  it("maps group comparison and text group rows", () => {
    expect(
      mapper.toGroupCompareResult({
        group_key: "비전관",
        group_label: "비전관",
        avg_score: 2.4,
        n: 8,
        is_lowest: true,
        is_highest: false,
        is_low_sample: true,
      }),
    ).toEqual({
      groupKey: "비전관",
      groupLabel: "비전관",
      averageScore: 2.4,
      n: 8,
      isHighest: false,
      isLowest: true,
      isLowSample: true,
    });

    expect(
      mapper.toTextGroup({
        group_key: "facility",
        label: "facility",
        topic_key: "facility",
        issue_type: null,
        question_id: "question-1",
        count: 3,
        representative_texts: ["조명이 어둡습니다.", "환기가 부족합니다."],
      }),
    ).toMatchObject({
      groupKey: "facility",
      label: "facility",
      count: 3,
      representativeTexts: ["조명이 어둡습니다.", "환기가 부족합니다."],
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

  it("maps priority TOP 5 RPC rows", () => {
    expect(
      mapper.toPriorityIssue({
        id: "facilities:restroom",
        label: "화장실 청결",
        source: "mixed",
        topic_key: "facilities",
        section_title: "생활관 시설",
        avg_importance: 4.7,
        avg_satisfaction: 2.4,
        avg_gap: 2.3,
        borich_score: 10.81,
        text_count: 6,
        tag_count: 3,
        n: 9,
      }),
    ).toEqual({
      id: "facilities:restroom",
      label: "화장실 청결",
      source: "mixed",
      topicKey: "facilities",
      sectionTitle: "생활관 시설",
      averageImportance: 4.7,
      averageSatisfaction: 2.4,
      gap: 2.3,
      borichScore: 10.81,
      textCount: 6,
      tagCount: 3,
      n: 9,
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

  it("maps image tag answer rows for participant uploaded photos", () => {
    expect(
      mapper.toImageTagAnswer({
        answer_id: "answer-upload-1",
        response_id: "response-1",
        section_id: "section-1",
        section_title: "생활관 시설",
        question_id: "question-upload",
        question_title: "직접 사진을 올려 표시해주세요.",
        question_type: "participant_image_tag",
        asset_id: null,
        answer_type: "participant_image_tag",
        x_ratio: 0.31,
        y_ratio: 0.72,
        tag_type: "수리 요청",
        severity: 3,
        text_value: "창틀이 흔들립니다.",
        value_json: { image: { storagePath: "participant-uploads/survey-1/user-1/question-upload/image.png" } },
        image_storage_bucket: "survey-assets",
        image_storage_path: "participant-uploads/survey-1/user-1/question-upload/image.png",
        image_signed_url: "https://example.com/image.png",
        dormitory: "A동",
        room_type: "2인실",
        rc: "장기려",
        department: "전산전자공학부",
        created_at: "2026-05-28T00:00:00.000Z",
      }),
    ).toEqual({
      id: "answer-upload-1",
      responseId: "response-1",
      sectionId: "section-1",
      sectionTitle: "생활관 시설",
      questionId: "question-upload",
      questionTitle: "직접 사진을 올려 표시해주세요.",
      questionType: "participant_image_tag",
      kind: "participant_upload",
      assetId: undefined,
      image: {
        assetId: undefined,
        storageBucket: "survey-assets",
        storagePath: "participant-uploads/survey-1/user-1/question-upload/image.png",
        signedUrl: "https://example.com/image.png",
        source: "participant_upload",
      },
      xRatio: 0.31,
      yRatio: 0.72,
      tagType: "수리 요청",
      severity: 3,
      textValue: "창틀이 흔들립니다.",
      valueJson: { image: { storagePath: "participant-uploads/survey-1/user-1/question-upload/image.png" } },
      responseProfile: {
        dormitory: "A동",
        roomType: "2인실",
        rc: "장기려",
        department: "전산전자공학부",
      },
      createdAt: "2026-05-28T00:00:00.000Z",
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
