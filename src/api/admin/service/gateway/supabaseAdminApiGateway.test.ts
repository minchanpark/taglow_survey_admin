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

  it("scopes survey reads to the current auth user before relying on RLS", async () => {
    const listQuery = createScopedSurveyQuery([]);
    const detailQuery = createScopedSurveyQuery({
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
    });
    const queries = [listQuery, detailQuery];
    const supabase = {
      auth: {
        getSession: vi.fn(async () => ({ data: { session: { user: { id: "user-1", email: "admin@example.com" } } }, error: null })),
        getUser: vi.fn(),
        signInWithOAuth: vi.fn(),
        signOut: vi.fn(),
      },
      from: vi.fn(() => queries.shift()),
      rpc: vi.fn(),
    };

    const gateway = new SupabaseAdminApiGateway(supabase as never);

    await gateway.listSurveys();
    await gateway.getSurvey("survey-1");

    expect(listQuery.eq).toHaveBeenCalledWith("created_by", "user-1");
    expect(detailQuery.eq).toHaveBeenCalledWith("id", "survey-1");
    expect(detailQuery.eq).toHaveBeenCalledWith("created_by", "user-1");
  });

  it("builds response summary and profile distribution directly from responses and profile question config", async () => {
    const responsesQuery = createTableQuery([
      { status: "submitted", gender: "남성", dormitory: "비전관", room_type: "2인실" },
      { status: "submitted", gender: "여성", dormitory: "비전관", room_type: "3인실" },
      { status: "submitted", gender: "여성", dormitory: "예상 밖", room_type: "2인실" },
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
          profileField: "dormitory",
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
      total_responses: 4,
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

  it("disambiguates the answers to responses relationship for image tag answers", async () => {
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
      rpc: vi.fn(),
    };

    const gateway = new SupabaseAdminApiGateway(supabase as never);
    await gateway.listImageTagAnswers({ surveyId: "survey-1", filters: {} });

    expect(calls.select).toContain("responses!answers_response_same_survey_fk!inner");
    expect(calls.eq).toContainEqual(["responses.status", "submitted"]);
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
      rpc: vi.fn(),
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
      rpc: vi.fn(),
    };

    const gateway = new SupabaseAdminApiGateway(supabase as never, "survey-assets");
    const rows = await gateway.listImageTagAnswers({ surveyId: "survey-1", filters: {} });

    expect(supabase.storage.from).toHaveBeenCalledWith("survey-assets");
    expect(createSignedUrl).toHaveBeenCalledWith("participant-uploads/survey-1/user-1/question-1/image.png", 60 * 60);
    expect(rows[0]).toMatchObject({
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
    expect(rows[0]).toMatchObject({
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
    expect(rows[0]).toMatchObject({
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
    rpc: vi.fn(),
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

function createTableQuery(data: unknown[]) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    order: vi.fn(() => query),
    then: (resolve: (value: { data: unknown[]; error: null }) => void, reject?: (reason: unknown) => void) =>
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
