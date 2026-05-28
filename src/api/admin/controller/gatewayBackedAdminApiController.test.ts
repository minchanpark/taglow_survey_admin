import { describe, expect, it, vi } from "vitest";
import type { AdminStorageGateway } from "../service/gateway/adminStorageGateway";
import type { AdminApiGateway } from "../service/gateway/adminApiGateway";
import type {
  RawCreateQuestionPayload,
  RawCreateSectionPayload,
  RawQuestion,
  RawSection,
  RawSurvey,
  RawUpdateQuestionPayload,
  RawUpdateSurveyPayload,
} from "../service/gateway/rawTypes";
import { GatewayBackedAdminApiController } from "./gatewayBackedAdminApiController";

const rawQuestion: RawQuestion = {
  id: "question-1",
  survey_id: "survey-1",
  section_id: "section-1",
  question_key: "bed_satisfaction",
  question_type: "scale",
  title_ko: "기존 질문",
  title_en: "Existing question",
  description_ko: "기존 설명",
  description_en: "Existing description",
  order_index: 0,
  is_required: true,
  metric_type: "satisfaction",
  topic_key: "bed",
  space_key: "room",
  config: {},
  validation: {},
};

const rawSection: RawSection = {
  id: "section-1",
  survey_id: "survey-1",
  section_key: "dorm_25_2_profile",
  title_ko: "기본 정보",
  title_en: null,
  description_ko: null,
  description_en: null,
  order_index: 0,
  section_type: "profile",
  settings: {},
};

describe("GatewayBackedAdminApiController question updates", () => {
  it("normalizes public slug clears and public code casing for survey updates", async () => {
    const updateSurvey = vi.fn(
      async (args: { surveyId: string; payload: RawUpdateSurveyPayload }): Promise<RawSurvey> => ({
      id: args.surveyId,
      title: "생활관 만족도 조사",
      description: null,
      status: "draft",
      public_slug: args.payload.public_slug ?? null,
      public_code: args.payload.public_code ?? "8K2PQA",
      version_group_id: "version-group-1",
      version_number: 1,
      parent_survey_id: null,
      is_latest_version: true,
      settings: {},
      created_by: "user-1",
      published_at: null,
      closed_at: null,
      created_at: "2026-05-28T00:00:00.000Z",
      updated_at: "2026-05-28T00:00:00.000Z",
      }),
    );
    const controller = new GatewayBackedAdminApiController(
      { updateSurvey } as unknown as AdminApiGateway,
      {} as AdminStorageGateway,
    );

    await controller.updateSurvey({
      surveyId: "survey-1",
      publicSlug: "",
      publicCode: "abc123",
    });

    expect(updateSurvey).toHaveBeenCalledWith({
      surveyId: "survey-1",
      payload: {
        public_slug: null,
        public_code: "ABC123",
      },
    });
  });

  it("sends question type updates and nullable clears to the gateway", async () => {
    const updateQuestion = vi.fn(
      async (args: { questionId: string; payload: RawUpdateQuestionPayload }): Promise<RawQuestion> => ({
        ...rawQuestion,
        ...args.payload,
        id: args.questionId,
      }),
    );
    const controller = new GatewayBackedAdminApiController(
      { updateQuestion } as unknown as AdminApiGateway,
      {} as AdminStorageGateway,
    );

    await controller.updateQuestion({
      questionId: "question-1",
      questionType: "single_choice",
      title: { ko: "새 질문" },
      description: undefined,
      isRequired: false,
      metricType: "none",
      topicKey: "",
      spaceKey: undefined,
      config: { options: [] },
      validation: {},
    });

    expect(updateQuestion).toHaveBeenCalledWith({
      questionId: "question-1",
      payload: {
        question_type: "single_choice",
        title_ko: "새 질문",
        title_en: null,
        description_ko: null,
        description_en: null,
        is_required: false,
        metric_type: "none",
        topic_key: null,
        space_key: null,
        config: { options: [] },
        validation: {},
      },
    });
  });
});

describe("GatewayBackedAdminApiController question set import", () => {
  it("previews existing section and question key conflicts before import", async () => {
    const controller = new GatewayBackedAdminApiController(
      {
        listSections: vi.fn(async () => [rawSection]),
        listQuestions: vi.fn(async () => [
          {
            ...rawQuestion,
            question_key: "dorm_25_2_q001",
          },
        ]),
      } as unknown as AdminApiGateway,
      {} as AdminStorageGateway,
    );

    const preview = await controller.previewQuestionSetImport({
      surveyId: "survey-1",
      templateId: "dorm_regular_25_2",
    });

    expect(preview.totalSectionCount).toBe(8);
    expect(preview.totalQuestionCount).toBe(195);
    expect(preview.importableSectionCount).toBe(7);
    expect(preview.importableQuestionCount).toBe(194);
    expect(preview.skippedQuestionCount).toBe(1);
    expect(preview.sections.find((section) => section.sectionKey === "dorm_25_2_profile")?.isExisting).toBe(true);
    expect(preview.questions.find((question) => question.questionKey === "dorm_25_2_q001")?.isExisting).toBe(true);
  });

  it("imports only missing sections and questions when appending a question set", async () => {
    const createSections = vi.fn(async (payloads: RawCreateSectionPayload[]): Promise<RawSection[]> =>
      payloads.map((payload, index) => ({
        id: `created-section-${index + 1}`,
        survey_id: payload.survey_id,
        section_key: payload.section_key,
        title_ko: payload.title_ko,
        title_en: payload.title_en ?? null,
        description_ko: payload.description_ko ?? null,
        description_en: payload.description_en ?? null,
        order_index: payload.order_index,
        section_type: payload.section_type ?? "general",
        settings: payload.settings ?? {},
      })),
    );
    const createQuestions = vi.fn(async (payloads: RawCreateQuestionPayload[]): Promise<RawQuestion[]> =>
      payloads.map((payload, index) => ({
        id: `created-question-${index + 1}`,
        survey_id: payload.survey_id,
        section_id: payload.section_id,
        question_key: payload.question_key,
        question_type: payload.question_type,
        title_ko: payload.title_ko,
        title_en: payload.title_en ?? null,
        description_ko: payload.description_ko ?? null,
        description_en: payload.description_en ?? null,
        order_index: payload.order_index,
        is_required: payload.is_required ?? false,
        metric_type: payload.metric_type ?? null,
        topic_key: payload.topic_key ?? null,
        space_key: payload.space_key ?? null,
        config: payload.config ?? {},
        validation: payload.validation ?? {},
      })),
    );
    const controller = new GatewayBackedAdminApiController(
      {
        listSections: vi.fn(async () => [rawSection]),
        listQuestions: vi.fn(async () => [
          {
            ...rawQuestion,
            question_key: "dorm_25_2_q001",
          },
        ]),
        createSections,
        createQuestions,
      } as unknown as AdminApiGateway,
      {} as AdminStorageGateway,
    );

    const result = await controller.importQuestionSet({
      surveyId: "survey-1",
      templateId: "dorm_regular_25_2",
      conflictMode: "append_skip_existing_keys",
    });

    expect(createSections).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({ section_key: "dorm_25_2_facilities" })]));
    expect(createSections.mock.calls[0]?.[0]).toHaveLength(7);
    expect(createQuestions.mock.calls[0]?.[0]).toHaveLength(194);
    expect(createQuestions.mock.calls[0]?.[0]).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ question_key: "dorm_25_2_q001" })]),
    );
    expect(createQuestions.mock.calls[0]?.[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          question_key: "dorm_25_2_q007",
          config: expect.objectContaining({
            importSource: "dorm_regular_25_2",
            sourceNumber: 7,
            displayGroup: "다음 자치회 사업에 대한 만족도는 어떠합니까? (학생 복지 부문)",
          }),
        }),
      ]),
    );
    expect(result.sectionsCreated).toBe(7);
    expect(result.questionsCreated).toBe(194);
    expect(result.questionsSkipped).toBe(1);
  });
});
