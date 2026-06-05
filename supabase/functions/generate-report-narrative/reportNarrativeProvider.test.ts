import { describe, expect, it, vi } from "vitest";
import {
  ReportNarrativeProviderError,
  createGeminiReportNarrativeProvider,
  createOpenAiReportNarrativeProvider,
  parseReportNarrativeResult,
  type ReportNarrativeCommand,
} from "./reportNarrativeProvider";

const command: ReportNarrativeCommand = {
  surveyId: "survey-1",
  metadata: { title: "생활관 보고서" },
  filters: { dormitory: "비전관" },
  blocks: [
    {
      id: "priority",
      kind: "priority",
      title: "주요 요약",
      summary: "초기 요약",
      n: 8,
      isLowSample: true,
      evidence: [{ id: "priority-1", label: "세탁실 혼잡", source: "priority", n: 8 }],
      body: ["세탁실 혼잡"],
    },
  ],
};

describe("reportNarrativeProvider", () => {
  it("calls the Responses API with structured outputs", async () => {
    const fetcher = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit): Promise<Response> =>
      new Response(
        JSON.stringify({
          output_text: JSON.stringify({
            generatedAt: "2026-06-05T00:00:00.000Z",
            blocks: [
              {
                blockId: "priority",
                summary: "세탁실 혼잡을 먼저 확인합니다.",
                body: ["세탁실 혼잡은 현재 응답에서 우선 확인할 항목입니다."],
                evidenceIds: ["priority-1"],
                caution: "N이 낮아 방향성 참고용으로 해석합니다.",
                suggestedActions: ["혼잡 시간대 확인"],
              },
            ],
          }),
        }),
        { status: 200 },
      ),
    );
    const provider = createOpenAiReportNarrativeProvider({ apiKey: "test-key", model: "gpt-5.5", fetcher });

    const result = await provider.generate(command);
    const firstCall = fetcher.mock.calls[0];
    const requestBody = JSON.parse(String(firstCall?.[1]?.body));

    expect(fetcher).toHaveBeenCalledWith("https://api.openai.com/v1/responses", expect.any(Object));
    expect(requestBody.model).toBe("gpt-5.5");
    expect(requestBody.text.format.type).toBe("json_schema");
    expect(requestBody.text.format.schema.properties.blocks.items.properties.body.type).toBe("array");
    expect(requestBody.text.format.schema.properties.blocks.items.properties.caution.type).toBe("string");
    expect(result.blocks[0]?.summary).toBe("세탁실 혼잡을 먼저 확인합니다.");
    expect(result.blocks[0]?.body).toEqual(["세탁실 혼잡은 현재 응답에서 우선 확인할 항목입니다."]);
  });

  it("calls the Gemini generateContent API with structured output", async () => {
    const fetcher = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit): Promise<Response> =>
      new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      generatedAt: "2026-06-05T00:00:00.000Z",
                      blocks: [
                        {
                          blockId: "priority",
                          summary: "세탁실 혼잡 대응을 우선합니다.",
                          body: ["세탁실 혼잡은 현재 응답에서 우선 확인할 항목입니다."],
                          evidenceIds: ["priority-1"],
                          caution: "N이 낮아 방향성 참고용으로 해석합니다.",
                          suggestedActions: ["혼잡 시간대 확인"],
                        },
                      ],
                    }),
                  },
                ],
              },
            },
          ],
        }),
        { status: 200 },
      ),
    );
    const provider = createGeminiReportNarrativeProvider({ apiKey: "test-key", model: "models/gemini-2.5-flash", fetcher });

    const result = await provider.generate(command);
    const firstCall = fetcher.mock.calls[0];
    const requestBody = JSON.parse(String(firstCall?.[1]?.body));

    expect(fetcher).toHaveBeenCalledWith("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent", expect.any(Object));
    expect(firstCall?.[1]?.headers).toMatchObject({ "x-goog-api-key": "test-key" });
    expect(requestBody.generationConfig.responseMimeType).toBe("application/json");
    expect(requestBody.generationConfig._responseJsonSchema.properties.blocks.items.properties.body.type).toBe("array");
    expect(requestBody.generationConfig._responseJsonSchema.properties.blocks.items.properties.caution.type).toBe("string");
    expect(requestBody.generationConfig.responseSchema).toBeUndefined();
    expect(result.blocks[0]?.summary).toBe("세탁실 혼잡 대응을 우선합니다.");
    expect(result.blocks[0]?.body).toEqual(["세탁실 혼잡은 현재 응답에서 우선 확인할 항목입니다."]);
  });

  it("throws when model output is malformed", () => {
    expect(() => parseReportNarrativeResult({ output_text: "not-json" })).toThrow();
  });

  it("throws when the provider returns an error", async () => {
    const fetcher = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit): Promise<Response> =>
      new Response(JSON.stringify({ error: { message: "quota exceeded", code: "insufficient_quota" } }), { status: 429 }),
    );
    const provider = createOpenAiReportNarrativeProvider({ apiKey: "test-key", model: "gpt-5.5", fetcher });

    await expect(provider.generate(command)).rejects.toThrow("quota exceeded");
    await expect(provider.generate(command)).rejects.toMatchObject({
      provider: "openai",
      status: 429,
      code: "insufficient_quota",
    } satisfies Partial<ReportNarrativeProviderError>);
  });
});
