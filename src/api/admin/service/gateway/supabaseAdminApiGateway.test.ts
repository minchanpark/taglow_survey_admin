import { describe, expect, it, vi } from "vitest";
import { SupabaseAdminApiGateway } from "./supabaseAdminApiGateway";

describe("SupabaseAdminApiGateway analysis queries", () => {
  it("uses RPCs for admin access requests and super-admin approvals", async () => {
    const pendingMember = {
      id: "admin-member-pending",
      user_id: "user-pending",
      email: "pending@example.com",
      role: "admin",
      is_active: false,
      created_at: "2026-05-28T01:00:00.000Z",
      updated_at: "2026-05-28T01:00:00.000Z",
    };
    const supabase = {
      auth: {
        getSession: vi.fn(),
        getUser: vi.fn(),
        signInWithOAuth: vi.fn(),
        signOut: vi.fn(),
      },
      from: vi.fn(),
      rpc: vi.fn(async (fn: string) => ({
        data: fn.startsWith("list_")
          ? [pendingMember]
          : fn === "update_admin_member_role"
            ? { ...pendingMember, role: "super_admin" }
            : pendingMember,
        error: null,
      })),
    };

    const gateway = new SupabaseAdminApiGateway(supabase as never);

    await expect(gateway.requestAdminAccess()).resolves.toMatchObject({ id: "admin-member-pending" });
    await expect(gateway.listPendingAdminMembers()).resolves.toHaveLength(1);
    await expect(gateway.listActiveAdminMembers()).resolves.toHaveLength(1);
    await expect(gateway.approveAdminMember({ memberId: "admin-member-pending", role: "admin" })).resolves.toMatchObject({
      email: "pending@example.com",
    });
    await expect(
      gateway.updateAdminMemberRole({ memberId: "admin-member-pending", role: "super_admin" }),
    ).resolves.toMatchObject({
      role: "super_admin",
    });
    await expect(gateway.deleteAdminMember({ memberId: "admin-member-pending" })).resolves.toBeUndefined();

    expect(supabase.rpc).toHaveBeenCalledWith("request_admin_access");
    expect(supabase.rpc).toHaveBeenCalledWith("list_pending_admin_members");
    expect(supabase.rpc).toHaveBeenCalledWith("list_active_admin_members");
    expect(supabase.rpc).toHaveBeenCalledWith("approve_admin_member", {
      p_member_id: "admin-member-pending",
      p_role: "admin",
    });
    expect(supabase.rpc).toHaveBeenCalledWith("update_admin_member_role", {
      p_member_id: "admin-member-pending",
      p_role: "super_admin",
    });
    expect(supabase.rpc).toHaveBeenCalledWith("delete_admin_member", {
      p_member_id: "admin-member-pending",
    });
  });

  it("reads owned and shared surveys through access-scoped RPCs", async () => {
    const surveyRow = {
      id: "survey-1",
      title: "생활관 만족도 조사",
      description: null,
      status: "draft",
      public_slug: null,
      public_code: "ABC123",
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
      access_role: "editor",
    };
    const supabase = {
      auth: {
        getSession: vi.fn(async () => ({ data: { session: { user: { id: "user-1", email: "admin@example.com" } } }, error: null })),
        getUser: vi.fn(),
        signInWithOAuth: vi.fn(),
        signOut: vi.fn(),
      },
      from: vi.fn(),
      rpc: vi.fn(async (fn: string) => ({
        data: fn === "list_accessible_surveys" ? [surveyRow] : surveyRow,
        error: null,
      })),
    };

    const gateway = new SupabaseAdminApiGateway(supabase as never);

    await expect(gateway.listSurveys()).resolves.toEqual([surveyRow]);
    await expect(gateway.getSurvey("survey-1")).resolves.toEqual(surveyRow);

    expect(supabase.auth.getSession).toHaveBeenCalledTimes(2);
    expect(supabase.rpc).toHaveBeenCalledWith("list_accessible_surveys");
    expect(supabase.rpc).toHaveBeenCalledWith("get_accessible_survey", {
      p_survey_id: "survey-1",
    });
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("uses survey collaborator table calls for list, invite, update, and revoke", async () => {
    const collaborator = {
      id: "collaborator-1",
      survey_id: "survey-1",
      email: "viewer@example.com",
      role: "viewer",
      invited_by: "user-1",
      created_at: "2026-05-28T00:00:00.000Z",
      updated_at: "2026-05-28T00:00:00.000Z",
      revoked_at: null,
    };
    const listQuery = createTableQuery([collaborator]);
    const insertQuery = createMutationQuery(collaborator);
    const updateQuery = createMutationQuery({ ...collaborator, role: "editor" });
    const queries = [listQuery, insertQuery, updateQuery];
    const supabase = {
      auth: {
        getSession: vi.fn(),
        getUser: vi.fn(),
        signInWithOAuth: vi.fn(),
        signOut: vi.fn(),
      },
      from: vi.fn(() => queries.shift()),
      rpc: vi.fn(),
    };
    const gateway = new SupabaseAdminApiGateway(supabase as never);

    await expect(gateway.listSurveyCollaborators("survey-1")).resolves.toEqual([collaborator]);
    await expect(
      gateway.createSurveyCollaborator({
        survey_id: "survey-1",
        email: "viewer@example.com",
        role: "manager",
        invited_by: "user-1",
      }),
    ).resolves.toEqual(collaborator);
    await expect(
      gateway.updateSurveyCollaborator({
        collaboratorId: "collaborator-1",
        payload: { role: "editor" },
      }),
    ).resolves.toMatchObject({ role: "editor" });

    expect(listQuery.eq).toHaveBeenCalledWith("survey_id", "survey-1");
    expect(listQuery.is).toHaveBeenCalledWith("revoked_at", null);
    expect(insertQuery.insert).toHaveBeenCalledWith({
      survey_id: "survey-1",
      email: "viewer@example.com",
      role: "manager",
      invited_by: "user-1",
    });
    expect(updateQuery.update).toHaveBeenCalledWith({ role: "editor" });
    expect(updateQuery.eq).toHaveBeenCalledWith("id", "collaborator-1");
  });

  it("builds response summary and profile distribution directly from responses and profile question config", async () => {
    const responsesQuery = createTableQuery([
      { status: "submitted", gender: "남성", dormitory: "비전관", room_type: "2인실" },
      { status: "submitted", gender: "여성", dormitory: "비전관", room_type: "3인실" },
      { status: "submitted", gender: "여성", dormitory: "예상 밖", room_type: "2인실" },
      { status: "submitted", passed_attention_check: false, gender: "남성", dormitory: "비전관", room_type: "2인실" },
      { status: "in_progress", gender: "남성", dormitory: "비전관", room_type: "2인실" },
    ]);
    const questionsQuery = createTableQuery([
      {
        id: "question-gender",
        survey_id: "survey-1",
        section_id: "section-1",
        question_key: "profile_gender",
        question_type: "profile",
        title_ko: "성별",
        title_en: null,
        description_ko: null,
        description_en: null,
        order_index: 0,
        is_required: true,
        metric_type: null,
        topic_key: null,
        space_key: null,
        config: {
          profileField: "gender",
          options: [
            { value: "남성", labelKo: "남성" },
            { value: "여성", labelKo: "여성" },
          ],
        },
        validation: {},
      },
      {
        id: "question-dormitory",
        survey_id: "survey-1",
        section_id: "section-1",
        question_key: "profile_dormitory",
        question_type: "profile",
        title_ko: "거주 생활관",
        title_en: null,
        description_ko: null,
        description_en: null,
        order_index: 1,
        is_required: true,
        metric_type: null,
        topic_key: null,
        space_key: null,
        config: {
          profileField: "Dormitory",
          options: [
            { value: "비전관", labelKo: "비전관" },
            { value: "은혜관", labelKo: "은혜관" },
          ],
        },
        validation: {},
      },
    ]);
    const supabase = {
      auth: {
        getSession: vi.fn(),
        getUser: vi.fn(),
        signInWithOAuth: vi.fn(),
        signOut: vi.fn(),
      },
      from: vi.fn((table: string) => (table === "responses" ? responsesQuery : questionsQuery)),
      rpc: vi.fn(missingResponseSummaryRpc),
    };

    const gateway = new SupabaseAdminApiGateway(supabase as never);
    const summary = await gateway.getResponseSummary({ surveyId: "survey-1", filters: { dormitory: "비전관" } });

    expect(summary).toMatchObject({
      total_responses: 5,
      submitted_responses: 3,
      filtered_responses: 2,
    });
    expect(summary.profile_distribution).toMatchObject({
      gender: [
        { key: "남성", label: "남성", n: 1, percentage: 50 },
        { key: "여성", label: "여성", n: 1, percentage: 50 },
      ],
      dormitory: [
        { key: "비전관", label: "비전관", n: 2, percentage: 100 },
        { key: "은혜관", label: "은혜관", n: 0, percentage: 0 },
      ],
    });
  });

  it("falls back to response profile columns when optional profile json columns are missing", async () => {
    const responseQueries = [
      createErrorTableQuery({
        message: "Could not find the 'profile_json' column of 'responses' in the schema cache",
      }),
      createTableQuery([{ status: "submitted", gender: "남성" }]),
    ];
    const questionsQuery = createTableQuery([
      {
        id: "question-gender",
        survey_id: "survey-1",
        section_id: "section-1",
        question_key: "profile_gender",
        question_type: "profile",
        title_ko: "성별",
        title_en: null,
        description_ko: null,
        description_en: null,
        order_index: 0,
        is_required: true,
        metric_type: null,
        topic_key: null,
        space_key: null,
        config: { profileField: "gender", options: [{ value: "남성", labelKo: "남성" }] },
        validation: {},
      },
    ]);
    const supabase = {
      auth: {
        getSession: vi.fn(),
        getUser: vi.fn(),
        signInWithOAuth: vi.fn(),
        signOut: vi.fn(),
      },
      from: vi.fn((table: string) => (table === "responses" ? responseQueries.shift() : questionsQuery)),
      rpc: vi.fn(missingResponseSummaryRpc),
    };

    const gateway = new SupabaseAdminApiGateway(supabase as never);
    const summary = await gateway.getResponseSummary({ surveyId: "survey-1", filters: {} });

    expect(summary.filtered_responses).toBe(1);
    expect(summary.profile_distribution?.gender).toEqual([
      { key: "남성", label: "남성", n: 1, percentage: 100, isUnclassified: false },
    ]);
  });

  it("uses profile_json and raw_payload values consistently when building the response summary fallback", async () => {
    const responsesQuery = createTableQuery([
      {
        status: "submitted",
        gender: "",
        dormitory: "",
        room_type: "",
        profile_json: { profile: { dormitory: "비전관" }, roomType: "2인실" },
        raw_payload: {},
      },
      {
        status: "submitted",
        gender: "",
        dormitory: "",
        room_type: "",
        profile_json: {},
        raw_payload: { profile: { dormitory: "은혜관" }, room_type: "3인실" },
      },
      {
        status: "submitted",
        gender: "",
        dormitory: "비전관",
        room_type: "2인실",
        profile_json: {},
        raw_payload: {},
      },
    ]);
    const questionsQuery = createTableQuery([
      {
        id: "question-dormitory",
        survey_id: "survey-1",
        section_id: "section-1",
        question_key: "profile_dormitory",
        question_type: "profile",
        title_ko: "거주 생활관",
        title_en: null,
        description_ko: null,
        description_en: null,
        order_index: 0,
        is_required: true,
        metric_type: null,
        topic_key: null,
        space_key: null,
        config: {
          profileField: "dormitory",
          options: [
            { value: "비전관", labelKo: "비전관" },
            { value: "은혜관", labelKo: "은혜관" },
          ],
        },
        validation: {},
      },
      {
        id: "question-room-type",
        survey_id: "survey-1",
        section_id: "section-1",
        question_key: "profile_room_type",
        question_type: "profile",
        title_ko: "인실",
        title_en: null,
        description_ko: null,
        description_en: null,
        order_index: 1,
        is_required: true,
        metric_type: null,
        topic_key: null,
        space_key: null,
        config: {
          profileField: "Room_type",
          options: [
            { value: "2인실", labelKo: "2인실" },
            { value: "3인실", labelKo: "3인실" },
          ],
        },
        validation: {},
      },
    ]);
    const supabase = {
      auth: {
        getSession: vi.fn(),
        getUser: vi.fn(),
        signInWithOAuth: vi.fn(),
        signOut: vi.fn(),
      },
      from: vi.fn((table: string) => (table === "responses" ? responsesQuery : questionsQuery)),
      rpc: vi.fn(missingResponseSummaryRpc),
    };

    const gateway = new SupabaseAdminApiGateway(supabase as never);
    const summary = await gateway.getResponseSummary({ surveyId: "survey-1", filters: { dormitory: "비전관", roomType: "2인실" } });

    expect(summary.filtered_responses).toBe(2);
    expect(summary.profile_distribution?.dormitory).toEqual([
      { key: "비전관", label: "비전관", n: 2, percentage: 100, isUnclassified: false },
      { key: "은혜관", label: "은혜관", n: 0, percentage: 0, isUnclassified: false },
    ]);
    expect(summary.profile_distribution?.roomType).toEqual([
      { key: "2인실", label: "2인실", n: 2, percentage: 100, isUnclassified: false },
      { key: "3인실", label: "3인실", n: 0, percentage: 0, isUnclassified: false },
    ]);
  });

  it("does not hide non-schema response summary failures behind a fallback query", async () => {
    const responsesQuery = createErrorTableQuery({ message: "permission denied for table responses" });
    const questionsQuery = createTableQuery([]);
    const supabase = {
      auth: {
        getSession: vi.fn(),
        getUser: vi.fn(),
        signInWithOAuth: vi.fn(),
        signOut: vi.fn(),
      },
      from: vi.fn((table: string) => (table === "responses" ? responsesQuery : questionsQuery)),
      rpc: vi.fn(missingResponseSummaryRpc),
    };

    const gateway = new SupabaseAdminApiGateway(supabase as never);

    await expect(gateway.getResponseSummary({ surveyId: "survey-1", filters: {} })).rejects.toMatchObject({
      code: "RPC_FAILED",
    });
    expect(supabase.from).toHaveBeenCalledTimes(2);
  });

  it("uses the response summary RPC when it is available", async () => {
    const supabase = {
      auth: {
        getSession: vi.fn(),
        getUser: vi.fn(),
        signInWithOAuth: vi.fn(),
        signOut: vi.fn(),
      },
      from: vi.fn(),
      rpc: vi.fn(async () => ({
        data: {
          total_responses: 12,
          submitted_responses: 11,
          filtered_responses: 10,
          low_sample_threshold: 10,
          is_low_sample: false,
          profile_distribution: {},
          low_sample_groups: [],
        },
        error: null,
      })),
    };

    const gateway = new SupabaseAdminApiGateway(supabase as never);
    const summary = await gateway.getResponseSummary({ surveyId: "survey-1", filters: { gender: "남성" } });

    expect(summary.filtered_responses).toBe(10);
    expect(supabase.rpc).toHaveBeenCalledWith("get_response_summary", {
      p_survey_id: "survey-1",
      p_filters: { gender: "남성" },
    });
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("loads identity responses through the analysis RPC first", async () => {
    const rpc = vi.fn(async () => ({
      data: [
        {
          response_id: "response-1",
          student_number: "22000123",
          name: "김태글",
          dormitory: "비전관",
          room_type: "2인실",
          submitted_at: "2026-05-29T00:00:00.000Z",
        },
      ],
      error: null,
    }));
    const supabase = {
      auth: {
        getSession: vi.fn(),
        getUser: vi.fn(),
        signInWithOAuth: vi.fn(),
        signOut: vi.fn(),
      },
      from: vi.fn(),
      rpc,
    };

    const gateway = new SupabaseAdminApiGateway(supabase as never);
    const rows = await gateway.listIdentityResponses({ surveyId: "survey-1", filters: { dormitory: "비전관", limit: 100 } });

    expect(rpc).toHaveBeenCalledWith("get_identity_responses", {
      p_survey_id: "survey-1",
      p_filters: { dormitory: "비전관", limit: 100 },
    });
    expect(supabase.from).not.toHaveBeenCalled();
    expect(rows.items[0]).toMatchObject({
      student_number: "22000123",
      name: "김태글",
    });
  });

  it("falls back to identity answers while excluding failed attention checks", async () => {
    const query = createTableQuery([
      {
        response_id: "response-1",
        text_value: "22000123",
        created_at: "2026-05-29T00:00:00.000Z",
        responses: {
          id: "response-1",
          status: "submitted",
          submitted_at: "2026-05-29T00:00:00.000Z",
          passed_attention_check: true,
          dormitory: "비전관",
          room_type: "2인실",
        },
        questions: {
          question_key: "student_number",
          title_ko: "학번",
          title_en: "Student ID",
          config: { profileField: "student_number" },
        },
      },
      {
        response_id: "response-1",
        text_value: "김태글",
        created_at: "2026-05-29T00:00:01.000Z",
        responses: {
          id: "response-1",
          status: "submitted",
          submitted_at: "2026-05-29T00:00:00.000Z",
          passed_attention_check: true,
          dormitory: "비전관",
          room_type: "2인실",
        },
        questions: {
          question_key: "name",
          title_ko: "이름",
          title_en: "Name",
          config: { profileField: "name" },
        },
      },
    ]);
    const supabase = {
      auth: {
        getSession: vi.fn(),
        getUser: vi.fn(),
        signInWithOAuth: vi.fn(),
        signOut: vi.fn(),
      },
      from: vi.fn(() => query),
      rpc: vi.fn(missingIdentityResponsesRpc),
    };

    const gateway = new SupabaseAdminApiGateway(supabase as never);
    const rows = await gateway.listIdentityResponses({ surveyId: "survey-1", filters: { dormitory: "비전관", room_type: "2인실", limit: 100 } });

    expect(query.eq).toHaveBeenCalledWith("responses.status", "submitted");
    expect(query.eq).toHaveBeenCalledWith("responses.passed_attention_check", true);
    expect(query.eq).toHaveBeenCalledWith("responses.dormitory", "비전관");
    expect(query.eq).toHaveBeenCalledWith("responses.room_type", "2인실");
    expect(rows.items).toEqual([
      expect.objectContaining({
        response_id: "response-1",
        student_number: "22000123",
        name: "김태글",
      }),
    ]);
  });

  it("unwraps single-row RPC arrays for one-row gateway calls", async () => {
    const supabase = {
      auth: {
        getSession: vi.fn(),
        getUser: vi.fn(),
        signInWithOAuth: vi.fn(),
        signOut: vi.fn(),
      },
      from: vi.fn(),
      rpc: vi.fn(async () => ({
        data: [
          {
            id: "survey-2",
            title: "다음 버전",
            description: null,
            status: "draft",
            public_slug: null,
            public_code: "ABC123",
            version_group_id: "version-group-1",
            version_number: 2,
            parent_survey_id: "survey-1",
            is_latest_version: true,
            settings: {},
            created_by: "user-1",
            published_at: null,
            closed_at: null,
            created_at: "2026-05-30T00:00:00.000Z",
            updated_at: "2026-05-30T00:00:00.000Z",
          },
        ],
        error: null,
      })),
    };

    const gateway = new SupabaseAdminApiGateway(supabase as never);

    await expect(gateway.createNextSurveyVersion("survey-1")).resolves.toMatchObject({
      id: "survey-2",
      version_number: 2,
    });
  });

  it("loads image tag answers through the analysis RPC first", async () => {
    const createSignedUrl = vi.fn(async () => ({ data: { signedUrl: "https://example.com/signed.png" }, error: null }));
    const rpc = vi.fn(async () => ({
      data: [
        {
          id: "answer-rpc-1",
          response_id: "response-rpc-1",
          section_id: "section-1",
          section_title: "시설",
          question_id: "question-1",
          question_title: "사진에 표시해주세요.",
          question_type: "participant_image_tag",
          asset_id: null,
          answer_type: "participant_image_tag",
          x_ratio: 0.42,
          y_ratio: 0.24,
          tag_type: "불편",
          severity: 3,
          text_value: "사진 설명",
          value_json: {},
          image_storage_bucket: "survey-assets",
          image_storage_path: "participant-uploads/survey-1/image.png",
          image_signed_url: null,
          created_at: "2026-05-29T00:00:00.000Z",
        },
      ],
      error: null,
    }));
    const supabase = {
      auth: {
        getSession: vi.fn(),
        getUser: vi.fn(),
        signInWithOAuth: vi.fn(),
        signOut: vi.fn(),
      },
      storage: {
        from: vi.fn(() => ({ createSignedUrl })),
      },
      from: vi.fn(),
      rpc,
    };

    const gateway = new SupabaseAdminApiGateway(supabase as never);
    const rows = await gateway.listImageTagAnswers({ surveyId: "survey-1", filters: { dormitory: "비전관" } });

    expect(rpc).toHaveBeenCalledWith("get_image_tag_answers", {
      p_survey_id: "survey-1",
      p_filters: { dormitory: "비전관" },
    });
    expect(supabase.from).not.toHaveBeenCalled();
    expect(createSignedUrl).toHaveBeenCalledWith("participant-uploads/survey-1/image.png", 60 * 60);
    expect(rows.items[0]).toMatchObject({
      image_signed_url: "https://example.com/signed.png",
    });
  });

  it("disambiguates the answers to responses relationship for image tag answers when the RPC is unavailable", async () => {
    const calls: { select?: string; eq: Array<[string, unknown]> } = { eq: [] };
    const query = {
      select: vi.fn((value: string) => {
        calls.select = value;
        return query;
      }),
      eq: vi.fn((column: string, value: unknown) => {
        calls.eq.push([column, value]);
        return query;
      }),
      in: vi.fn(() => query),
      order: vi.fn(() => query),
      then: (resolve: (value: { data: unknown[]; error: null }) => void, reject?: (reason: unknown) => void) =>
        Promise.resolve({ data: [], error: null }).then(resolve, reject),
    };
    const supabase = {
      auth: {
        getSession: vi.fn(),
        getUser: vi.fn(),
        signInWithOAuth: vi.fn(),
        signOut: vi.fn(),
      },
      from: vi.fn(() => query),
      rpc: vi.fn(missingImageTagAnswersRpc),
    };

    const gateway = new SupabaseAdminApiGateway(supabase as never);
    await gateway.listImageTagAnswers({ surveyId: "survey-1", filters: {} });

    expect(calls.select).toContain("responses!answers_response_same_survey_fk!inner");
    expect(calls.eq).toContainEqual(["responses.status", "submitted"]);
    expect(calls.eq).toContainEqual(["responses.passed_attention_check", true]);
  });

  it("falls back to the generic answers to responses relationship when the named relationship is unavailable", async () => {
    const selectCalls: string[] = [];
    const answerQueries = [
      createImageTagQuery({
        selectCalls,
        error: {
          message: "Could not find a relationship between 'answers' and 'responses' in the schema cache",
        },
      }),
      createImageTagQuery({ selectCalls, data: [] }),
    ];
    const supabase = {
      auth: {
        getSession: vi.fn(),
        getUser: vi.fn(),
        signInWithOAuth: vi.fn(),
        signOut: vi.fn(),
      },
      from: vi.fn(() => answerQueries.shift()),
      rpc: vi.fn(missingImageTagAnswersRpc),
    };

    const gateway = new SupabaseAdminApiGateway(supabase as never);
    await gateway.listImageTagAnswers({ surveyId: "survey-1", filters: {} });

    expect(selectCalls[0]).toContain("responses!answers_response_same_survey_fk!inner");
    expect(selectCalls[1]).toContain("responses!inner");
  });

  it("creates signed URLs for participant uploads when value_json only stores a path", async () => {
    const query = {
      select: vi.fn(() => query),
      eq: vi.fn(() => query),
      in: vi.fn(() => query),
      order: vi.fn(() => query),
      then: (resolve: (value: { data: unknown[]; error: null }) => void, reject?: (reason: unknown) => void) =>
        Promise.resolve({
          data: [
            {
              id: "answer-1",
              response_id: "response-1",
              section_id: "section-1",
              question_id: "question-1",
              answer_type: "participant_image_tag",
              x_ratio: 0.42,
              y_ratio: 0.24,
              value_json: {
                image: {
                  storagePath: "participant-uploads/survey-1/user-1/question-1/image.png",
                },
              },
              created_at: "2026-05-29T00:00:00.000Z",
              responses: { status: "submitted", dormitory: "A동" },
              questions: { question_type: "participant_image_tag", title_ko: "사진을 올려 표시해주세요." },
              survey_sections: { title_ko: "시설" },
            },
          ],
          error: null,
        }).then(resolve, reject),
    };
    const createSignedUrl = vi.fn(async () => ({ data: { signedUrl: "https://example.com/signed.png" }, error: null }));
    const supabase = {
      auth: {
        getSession: vi.fn(),
        getUser: vi.fn(),
        signInWithOAuth: vi.fn(),
        signOut: vi.fn(),
      },
      storage: {
        from: vi.fn(() => ({ createSignedUrl })),
      },
      from: vi.fn(() => query),
      rpc: vi.fn(missingImageTagAnswersRpc),
    };

    const gateway = new SupabaseAdminApiGateway(supabase as never, "survey-assets");
    const rows = await gateway.listImageTagAnswers({ surveyId: "survey-1", filters: {} });

    expect(supabase.storage.from).toHaveBeenCalledWith("survey-assets");
    expect(createSignedUrl).toHaveBeenCalledWith("participant-uploads/survey-1/user-1/question-1/image.png", 60 * 60);
    expect(rows.items[0]).toMatchObject({
      image_storage_bucket: "survey-assets",
      image_storage_path: "participant-uploads/survey-1/user-1/question-1/image.png",
      image_signed_url: "https://example.com/signed.png",
    });
  });

  it("finds uploaded image paths nested inside answer json", async () => {
    const query = {
      select: vi.fn(() => query),
      eq: vi.fn(() => query),
      in: vi.fn(() => query),
      order: vi.fn(() => query),
      then: (resolve: (value: { data: unknown[]; error: null }) => void, reject?: (reason: unknown) => void) =>
        Promise.resolve({
          data: [
            {
              id: "answer-2",
              response_id: "response-2",
              section_id: "section-1",
              question_id: "question-1",
              answer_type: "participant_image_tag",
              x_ratio: 0.12,
              y_ratio: 0.64,
              value_json: {
                tags: [
                  {
                    image: {
                      path: "participant-uploads/survey-1/user-1/question-1/nested.png",
                    },
                  },
                ],
              },
              created_at: "2026-05-29T00:00:00.000Z",
              responses: { status: "submitted" },
              questions: { question_type: "participant_image_tag", title_ko: "사진을 올려 표시해주세요." },
            },
          ],
          error: null,
        }).then(resolve, reject),
    };
    const createSignedUrl = vi.fn(async () => ({ data: { signedUrl: "https://example.com/nested.png" }, error: null }));
    const supabase = createSupabaseStub(query, createSignedUrl);

    const gateway = new SupabaseAdminApiGateway(supabase as never, "survey-assets");
    const rows = await gateway.listImageTagAnswers({ surveyId: "survey-1", filters: {} });

    expect(createSignedUrl).toHaveBeenCalledWith("participant-uploads/survey-1/user-1/question-1/nested.png", 60 * 60);
    expect(rows.items[0]).toMatchObject({
      image_storage_bucket: "survey-assets",
      image_storage_path: "participant-uploads/survey-1/user-1/question-1/nested.png",
      image_signed_url: "https://example.com/nested.png",
    });
  });

  it("uses the tagged asset row when an answer only has asset_id", async () => {
    const query = {
      select: vi.fn(() => query),
      eq: vi.fn(() => query),
      in: vi.fn(() => query),
      order: vi.fn(() => query),
      then: (resolve: (value: { data: unknown[]; error: null }) => void, reject?: (reason: unknown) => void) =>
        Promise.resolve({
          data: [
            {
              id: "answer-3",
              response_id: "response-3",
              section_id: "section-1",
              question_id: "question-1",
              asset_id: "asset-upload-1",
              answer_type: "participant_image_tag",
              x_ratio: 0.72,
              y_ratio: 0.16,
              value_json: {},
              created_at: "2026-05-29T00:00:00.000Z",
              responses: { status: "submitted" },
              questions: { question_type: "participant_image_tag", title_ko: "사진을 올려 표시해주세요." },
              survey_assets: {
                storage_bucket: "survey-assets",
                storage_path: "participant-uploads/survey-1/user-1/question-1/asset.png",
              },
            },
          ],
          error: null,
        }).then(resolve, reject),
    };
    const createSignedUrl = vi.fn(async () => ({ data: { signedUrl: "https://example.com/asset.png" }, error: null }));
    const supabase = createSupabaseStub(query, createSignedUrl);

    const gateway = new SupabaseAdminApiGateway(supabase as never, "survey-assets");
    const rows = await gateway.listImageTagAnswers({ surveyId: "survey-1", filters: {} });

    expect(createSignedUrl).toHaveBeenCalledWith("participant-uploads/survey-1/user-1/question-1/asset.png", 60 * 60);
    expect(rows.items[0]).toMatchObject({
      asset_id: "asset-upload-1",
      image_storage_bucket: "survey-assets",
      image_storage_path: "participant-uploads/survey-1/user-1/question-1/asset.png",
      image_signed_url: "https://example.com/asset.png",
    });
  });
});

function createSupabaseStub(query: unknown, createSignedUrl: unknown) {
  return {
    auth: {
      getSession: vi.fn(),
      getUser: vi.fn(),
      signInWithOAuth: vi.fn(),
      signOut: vi.fn(),
    },
    storage: {
      from: vi.fn(() => ({ createSignedUrl })),
    },
    from: vi.fn(() => query),
    rpc: vi.fn(missingImageTagAnswersRpc),
  };
}

async function missingResponseSummaryRpc() {
  return {
    data: null,
    error: {
      message: "Could not find the function public.get_response_summary in the schema cache",
    },
  };
}

async function missingImageTagAnswersRpc() {
  return {
    data: null,
    error: {
      message: "Could not find the function public.get_image_tag_answers in the schema cache",
    },
  };
}

async function missingIdentityResponsesRpc() {
  return {
    data: null,
    error: {
      message: "Could not find the function public.get_identity_responses in the schema cache",
    },
  };
}

function createTableQuery(data: unknown[]) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    is: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn(() => query),
    then: (resolve: (value: { data: unknown[]; error: null }) => void, reject?: (reason: unknown) => void) =>
      Promise.resolve({ data, error: null }).then(resolve, reject),
  };
  return query;
}

function createMutationQuery(data: unknown) {
  const query = {
    insert: vi.fn(() => query),
    update: vi.fn(() => query),
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    single: vi.fn(() => query),
    then: (resolve: (value: { data: unknown; error: null }) => void, reject?: (reason: unknown) => void) =>
      Promise.resolve({ data, error: null }).then(resolve, reject),
  };
  return query;
}

function createScopedSurveyQuery(data: unknown) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    order: vi.fn(() => query),
    single: vi.fn(() => query),
    then: (resolve: (value: { data: unknown; error: null }) => void, reject?: (reason: unknown) => void) =>
      Promise.resolve({ data, error: null }).then(resolve, reject),
  };
  return query;
}

function createErrorTableQuery(error: unknown) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    order: vi.fn(() => query),
    then: (resolve: (value: { data: null; error: unknown }) => void, reject?: (reason: unknown) => void) =>
      Promise.resolve({ data: null, error }).then(resolve, reject),
  };
  return query;
}

function createImageTagQuery(args: { selectCalls: string[]; data?: unknown[]; error?: unknown }) {
  const query = {
    select: vi.fn((value: string) => {
      args.selectCalls.push(value);
      return query;
    }),
    eq: vi.fn(() => query),
    in: vi.fn(() => query),
    order: vi.fn(() => query),
    then: (resolve: (value: { data: unknown[] | null; error: unknown }) => void, reject?: (reason: unknown) => void) =>
      Promise.resolve({ data: args.data ?? null, error: args.error ?? null }).then(resolve, reject),
  };
  return query;
}
