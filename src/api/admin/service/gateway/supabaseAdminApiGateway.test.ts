import { describe, expect, it, vi } from "vitest";
import { SupabaseAdminApiGateway } from "./supabaseAdminApiGateway";

describe("SupabaseAdminApiGateway analysis queries", () => {
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
