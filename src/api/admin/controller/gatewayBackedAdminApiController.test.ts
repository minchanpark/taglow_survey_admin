import { describe, expect, it, vi } from "vitest";
import type { AdminStorageGateway } from "../service/gateway/adminStorageGateway";
import type { AdminApiGateway } from "../service/gateway/adminApiGateway";
import type {
  RawAdminMember,
  RawCreateQuestionPayload,
  RawCreateSectionPayload,
  RawQuestion,
  RawSection,
  RawSurvey,
  RawSurveyCollaborator,
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

const rawPendingAdminMember: RawAdminMember = {
  id: "admin-member-pending",
  user_id: "user-pending",
  email: "pending@example.com",
  role: "admin",
  is_active: false,
  created_at: "2026-05-28T01:00:00.000Z",
  updated_at: "2026-05-28T01:00:00.000Z",
};

const rawActiveAdminMember: RawAdminMember = {
  id: "admin-member-active",
  user_id: "user-active",
  email: "member@example.com",
  role: "admin",
  is_active: true,
  created_at: "2026-05-28T02:00:00.000Z",
  updated_at: "2026-05-28T02:00:00.000Z",
};

const rawCollaborator: RawSurveyCollaborator = {
  id: "collaborator-1",
  survey_id: "survey-1",
  email: "viewer@example.com",
  role: "viewer",
  invited_by: "user-1",
  created_at: "2026-05-28T00:00:00.000Z",
  updated_at: "2026-05-28T00:00:00.000Z",
  revoked_at: null,
};

describe("GatewayBackedAdminApiController question updates", () => {
  it("returns inactive own admin member as a pending admin request in the session state", async () => {
    const controller = new GatewayBackedAdminApiController(
      {
        getCurrentAuthUser: vi.fn(async () => ({ id: "user-pending", email: "PENDING@example.com" })),
        getOwnAdminMember: vi.fn(async () => rawPendingAdminMember),
        hasAccessibleSurveys: vi.fn(async () => false),
      } as unknown as AdminApiGateway,
      {} as AdminStorageGateway,
    );

    await expect(controller.getAdminSessionState()).resolves.toMatchObject({
      isAuthenticated: true,
      email: "pending@example.com",
      pendingAdmin: {
        id: "admin-member-pending",
        email: "pending@example.com",
        isActive: false,
      },
    });
  });

  it("allows a signed-in user with only survey access to enter the admin shell", async () => {
    const controller = new GatewayBackedAdminApiController(
      {
        getCurrentAuthUser: vi.fn(async () => ({ id: "user-shared", email: "viewer@example.com" })),
        getOwnAdminMember: vi.fn(async () => null),
        hasAccessibleSurveys: vi.fn(async () => true),
      } as unknown as AdminApiGateway,
      {} as AdminStorageGateway,
    );

    await expect(controller.getAdminSessionState()).resolves.toMatchObject({
      isAuthenticated: true,
      email: "viewer@example.com",
      hasSurveyAccess: true,
      admin: undefined,
    });
  });

  it("maps collaborator invite, role update, and revoke commands through the gateway boundary", async () => {
    const createSurveyCollaborator = vi.fn(
      async (payload: { role: string; email: string; survey_id: string; invited_by: string }): Promise<RawSurveyCollaborator> => ({
        ...rawCollaborator,
        survey_id: payload.survey_id,
        email: payload.email,
        role: payload.role,
        invited_by: payload.invited_by,
      }),
    );
    const updateSurveyCollaborator = vi.fn(async (args: { payload: { role?: string; revoked_at?: string | null } }): Promise<RawSurveyCollaborator> => ({
      ...rawCollaborator,
      role: args.payload.role ?? rawCollaborator.role,
      revoked_at: args.payload.revoked_at ?? rawCollaborator.revoked_at,
    }));
    const controller = new GatewayBackedAdminApiController(
      {
        getCurrentAuthUser: vi.fn(async () => ({ id: "user-1", email: "owner@example.com" })),
        createSurveyCollaborator,
        updateSurveyCollaborator,
      } as unknown as AdminApiGateway,
      {} as AdminStorageGateway,
    );

    await expect(
      controller.inviteSurveyCollaborator({
        surveyId: "survey-1",
        email: " VIEWER@example.com ",
        role: "manager",
      }),
    ).resolves.toMatchObject({
      email: "viewer@example.com",
      role: "manager",
    });
    await expect(
      controller.updateSurveyCollaboratorRole({
        collaboratorId: "collaborator-1",
        surveyId: "survey-1",
        role: "editor",
      }),
    ).resolves.toMatchObject({ role: "editor" });
    await expect(
      controller.revokeSurveyCollaborator({
        collaboratorId: "collaborator-1",
        surveyId: "survey-1",
      }),
    ).resolves.toMatchObject({ id: "collaborator-1" });

    expect(createSurveyCollaborator).toHaveBeenCalledWith({
      survey_id: "survey-1",
      email: "viewer@example.com",
      role: "manager",
      invited_by: "user-1",
    });
    expect(updateSurveyCollaborator).toHaveBeenCalledWith({
      collaboratorId: "collaborator-1",
      payload: { role: "editor" },
    });
    expect(updateSurveyCollaborator).toHaveBeenLastCalledWith({
      collaboratorId: "collaborator-1",
      payload: { revoked_at: expect.any(String) },
    });
  });

  it("maps admin approval commands through the gateway boundary", async () => {
    const approveAdminMember = vi.fn(async (args: { memberId: string; role: "admin" }): Promise<RawAdminMember> => ({
      ...rawPendingAdminMember,
      id: args.memberId,
      role: args.role,
      is_active: true,
    }));
    const controller = new GatewayBackedAdminApiController(
      {
        listActiveAdminMembers: vi.fn(async () => [rawActiveAdminMember]),
        approveAdminMember,
        updateAdminMemberRole: vi.fn(
          async (args: { memberId: string; role: "super_admin" }): Promise<RawAdminMember> => ({
            ...rawActiveAdminMember,
            id: args.memberId,
            role: args.role,
          }),
        ),
        deleteAdminMember: vi.fn(async () => undefined),
      } as unknown as AdminApiGateway,
      {} as AdminStorageGateway,
    );

    await expect(controller.listActiveAdminMembers()).resolves.toMatchObject([
      {
        id: "admin-member-active",
        role: "admin",
        isActive: true,
      },
    ]);
    await expect(controller.approveAdminMember({ memberId: "admin-member-pending", role: "admin" })).resolves.toMatchObject({
      id: "admin-member-pending",
      role: "admin",
      isActive: true,
    });
    await expect(
      controller.updateAdminMemberRole({ memberId: "admin-member-active", role: "super_admin" }),
    ).resolves.toMatchObject({
      id: "admin-member-active",
      role: "super_admin",
      isActive: true,
    });
    await expect(controller.deleteAdminMember({ memberId: "admin-member-active" })).resolves.toBeUndefined();
    expect(approveAdminMember).toHaveBeenCalledWith({ memberId: "admin-member-pending", role: "admin" });
  });

  it("forwards survey archive and delete actions to the gateway boundary", async () => {
    const archiveSurvey = vi.fn(async (surveyId: string): Promise<RawSurvey> => ({
      id: surveyId,
      title: "생활관 만족도 조사",
      description: null,
      status: "archived",
      public_slug: null,
      public_code: "8K2PQA",
      version_group_id: "version-group-1",
      version_number: 1,
      parent_survey_id: null,
      is_latest_version: true,
      settings: {},
      created_by: "user-1",
      published_at: null,
      closed_at: "2026-05-28T00:00:00.000Z",
      created_at: "2026-05-28T00:00:00.000Z",
      updated_at: "2026-05-28T00:00:00.000Z",
    }));
    const deleteSurvey = vi.fn(async () => undefined);
    const controller = new GatewayBackedAdminApiController(
      { archiveSurvey, deleteSurvey } as unknown as AdminApiGateway,
      {} as AdminStorageGateway,
    );

    const archived = await controller.archiveSurvey("survey-1");
    await controller.deleteSurvey("survey-1");
    await controller.deleteDraftSurvey("survey-1");

    expect(archived.status).toBe("archived");
    expect(archiveSurvey).toHaveBeenCalledWith("survey-1");
    expect(deleteSurvey).toHaveBeenCalledTimes(2);
    expect(deleteSurvey).toHaveBeenCalledWith("survey-1");
  });

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

  it("splits localized survey intro copy into raw survey columns", async () => {
    const updateSurvey = vi.fn(
      async (args: { surveyId: string; payload: RawUpdateSurveyPayload }): Promise<RawSurvey> => ({
        id: args.surveyId,
        title: "생활관 만족도 조사",
        description: args.payload.description ?? null,
        description_en: args.payload.description_en ?? null,
        status: "draft",
        public_slug: null,
        public_code: "8K2PQA",
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
      description: {
        ko: "생활관 생활 경험을 바탕으로 응답해주세요.",
        en: "Please answer based on your dormitory experience.",
      },
    });

    expect(updateSurvey).toHaveBeenCalledWith({
      surveyId: "survey-1",
      payload: {
        description: "생활관 생활 경험을 바탕으로 응답해주세요.",
        description_en: "Please answer based on your dormitory experience.",
      },
    });
  });

  it("maps optional English survey title to title_en", async () => {
    const updateSurvey = vi.fn(
      async (args: { surveyId: string; payload: RawUpdateSurveyPayload }): Promise<RawSurvey> => ({
        id: args.surveyId,
        title: args.payload.title ?? "생활관 만족도 조사",
        title_en: args.payload.title_en ?? null,
        description: null,
        status: "draft",
        public_slug: null,
        public_code: "8K2PQA",
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
      title: { ko: "생활관 만족도 조사", en: "Dormitory Satisfaction Survey" },
    });

    expect(updateSurvey).toHaveBeenCalledWith({
      surveyId: "survey-1",
      payload: {
        title: "생활관 만족도 조사",
        title_en: "Dormitory Satisfaction Survey",
      },
    });
  });

  it("maps survey schedule updates to nullable raw timestamp columns", async () => {
    const updateSurvey = vi.fn(
      async (args: { surveyId: string; payload: RawUpdateSurveyPayload }): Promise<RawSurvey> => ({
        id: args.surveyId,
        title: "생활관 만족도 조사",
        description: null,
        status: "draft",
        public_slug: null,
        public_code: "8K2PQA",
        version_group_id: "version-group-1",
        version_number: 1,
        parent_survey_id: null,
        is_latest_version: true,
        settings: {},
        created_by: "user-1",
        starts_at: args.payload.starts_at ?? null,
        ends_at: args.payload.ends_at ?? null,
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
      startsAt: "2026-06-05T00:00:00.000Z",
      endsAt: undefined,
    });

    expect(updateSurvey).toHaveBeenCalledWith({
      surveyId: "survey-1",
      payload: {
        starts_at: "2026-06-05T00:00:00.000Z",
        ends_at: null,
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

  it("derives analysis filter options from profile question config", async () => {
    const getFilterOptions = vi.fn();
    const controller = new GatewayBackedAdminApiController(
      {
        listQuestions: vi.fn(async () => [
          {
            ...rawQuestion,
            id: "question-gender",
            question_key: "profile_gender",
            question_type: "profile",
            title_ko: "성별",
            config: {
              profileField: "gender",
              inputType: "single_choice",
              options: [
                { value: "남성", labelKo: "남성" },
                { value: "여성", labelKo: "여성" },
              ],
            },
          },
        ]),
        getFilterOptions,
      } as unknown as AdminApiGateway,
      {} as AdminStorageGateway,
    );

    await expect(controller.getFilterOptions("survey-1")).resolves.toMatchObject({
      genders: ["남성", "여성"],
    });
    expect(getFilterOptions).not.toHaveBeenCalled();
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
      templateId: "handong-dom-survey-2026-1",
    });

    expect(preview.title).toBe("2026년도 1학기 생활관 정기 설문조사 질문 목록");
    expect(preview.totalSectionCount).toBe(7);
    expect(preview.totalQuestionCount).toBe(191);
    expect(preview.importableSectionCount).toBe(6);
    expect(preview.importableQuestionCount).toBe(190);
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
      templateId: "handong-dom-survey-2026-1",
      conflictMode: "append_skip_existing_keys",
    });

    expect(createSections).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({ section_key: "dorm_25_2_facilities" })]));
    expect(createSections.mock.calls[0]?.[0]).toHaveLength(6);
    expect(createQuestions.mock.calls[0]?.[0]).toHaveLength(190);
    expect(createQuestions.mock.calls[0]?.[0]).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ question_key: "dorm_25_2_q001" })]),
    );
    expect(createQuestions.mock.calls[0]?.[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          question_key: "dorm_25_2_q154",
          question_type: "matrix_multi_select",
          title_ko: "주로 세탁기 및 건조기를 사용하는 요일과 시간대는 언제입니까? (중복 선택 가능)",
          config: expect.objectContaining({
            importSource: "handong-dom-survey-2026-1",
            sourceNumber: 154,
            minSelect: 0,
            matrixRows: expect.arrayContaining([{ value: "05_00_07_00", labelKo: "05:00~07:00", labelEn: "05:00~07:00" }]),
            matrixColumns: expect.arrayContaining([{ value: "mon", labelKo: "월", labelEn: "Mon" }]),
            options: expect.arrayContaining([
              {
                value: "mon_05_00_07_00",
                labelKo: "월 - 05:00~07:00",
                labelEn: "Mon - 05:00~07:00",
              },
              {
                value: "sun_21_00_23_00",
                labelKo: "일 - 21:00~23:00",
                labelEn: "Sun - 21:00~23:00",
              },
            ]),
          }),
        }),
        expect.objectContaining({
          question_key: "question_mpqzy65n",
          question_type: "participant_image_tag",
          config: expect.objectContaining({
            importSource: "handong-dom-survey-2026-1",
            sourceNumber: 195,
            displayGroup: "'화장실'과 관련된 다음 항목에 대한 만족도는 어떠합니까?",
            displayGroupEn: "What is your level of satisfaction with the following aspects of the 'Bathroom'?",
          }),
        }),
      ]),
    );
    expect(result.sectionsCreated).toBe(6);
    expect(result.questionsCreated).toBe(190);
    expect(result.questionsSkipped).toBe(1);
  });
});

describe("GatewayBackedAdminApiController analysis identity responses", () => {
  it("lists identity responses through the analysis boundary with normalized filters", async () => {
    const listIdentityResponses = vi.fn(async () => ({
      items: [
        {
          response_id: "response-1",
          student_number: "22000123",
          name: "김태글",
          dormitory: "비전관",
          room_type: "2인실",
          submitted_at: "2026-05-28T00:00:00.000Z",
        },
      ],
      next_cursor: "cursor-1",
    }));
    const controller = new GatewayBackedAdminApiController(
      { listIdentityResponses } as unknown as AdminApiGateway,
      {} as AdminStorageGateway,
    );

    await expect(
      controller.listIdentityResponses({
        surveyId: "survey-1",
        filters: { dormitory: "비전관", roomType: "2인실", limit: 100 },
      }),
    ).resolves.toEqual({
      items: [
        {
          responseId: "response-1",
          studentNumber: "22000123",
          name: "김태글",
          profile: {
            dormitory: "비전관",
            roomType: "2인실",
          },
          submittedAt: "2026-05-28T00:00:00.000Z",
        },
      ],
      nextCursor: "cursor-1",
    });

    expect(listIdentityResponses).toHaveBeenCalledWith({
      surveyId: "survey-1",
      filters: expect.objectContaining({
        dormitory: "비전관",
        room_type: "2인실",
        limit: 100,
      }),
    });
  });
});

describe("GatewayBackedAdminApiController report narrative", () => {
  it("sanitizes narrative payloads and normalizes provider results", async () => {
    const generateReportNarrative = vi.fn(async (command) => ({
      generatedAt: "2026-06-05T00:00:00.000Z",
      blocks: [
        {
          blockId: "priority",
          summary: "세탁실 혼잡을 먼저 확인합니다.",
          body: ["세탁실 혼잡은 필터 조건에서 반복적으로 확인되는 개선 항목입니다."],
          evidenceIds: ["priority-1", "bad-id"],
          suggestedActions: ["혼잡 시간대 확인"],
        },
      ],
      received: command,
    }));
    const controller = new GatewayBackedAdminApiController(
      { generateReportNarrative } as unknown as AdminApiGateway,
      {} as AdminStorageGateway,
    );

    const result = await controller.generateReportNarrative({
      surveyId: "survey-1",
      metadata: {
        title: "생활관 보고서",
        term: "26-1",
        reportDate: "2026-06-05",
        author: "생활관자치회",
        surveyPeriod: "2026.05.01-2026.05.10",
        audience: "생활관 거주 학생",
        method: "온라인 설문",
        purpose: "개선 우선순위 확인",
      },
      filters: { dormitory: "비전관" },
      blocks: [
        {
          id: "priority",
          kind: "priority",
          title: "주요 요약",
          summary: "초기 요약",
          n: 8,
          filters: { dormitory: "비전관" },
          isLowSample: true,
          evidence: [{ id: "priority-1", label: "세탁실 혼잡", source: "priority", n: 8 }],
          body: ["student_id=22000123 test@example.com 세탁실 혼잡"],
        },
      ],
    });

    expect(JSON.stringify(generateReportNarrative.mock.calls[0]?.[0])).not.toContain("test@example.com");
    expect(JSON.stringify(generateReportNarrative.mock.calls[0]?.[0])).not.toContain("22000123");
    expect(result.blocks[0]).toMatchObject({
      blockId: "priority",
      body: ["세탁실 혼잡은 필터 조건에서 반복적으로 확인되는 개선 항목입니다."],
      evidenceIds: ["priority-1"],
      caution: "N이 낮아 방향성 참고용으로 해석해야 합니다.",
    });
  });
});
