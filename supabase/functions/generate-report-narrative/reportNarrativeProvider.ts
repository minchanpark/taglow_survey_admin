export type ReportNarrativeCommand = Readonly<{
  surveyId: string;
  metadata: Record<string, string>;
  filters: Record<string, unknown>;
  blocks: Array<
    Readonly<{
      id: string;
      kind: string;
      title: string;
      summary: string;
      n: number;
      isLowSample: boolean;
      evidence: Array<Readonly<{ id: string; label: string; source: string; n?: number }>>;
      body?: string[];
    }>
  >;
}>;

export type ReportNarrativeResult = Readonly<{
  generatedAt: string;
  blocks: Array<
    Readonly<{
      blockId: string;
      summary: string;
      body: string[];
      evidenceIds: string[];
      caution?: string;
      suggestedActions: string[];
    }>
  >;
}>;

export interface ReportNarrativeProvider {
  generate(command: ReportNarrativeCommand): Promise<ReportNarrativeResult>;
}

type OpenAiProviderOptions = Readonly<{
  apiKey: string;
  model: string;
  fetcher?: typeof fetch;
}>;

type GeminiProviderOptions = Readonly<{
  apiKey: string;
  model: string;
  fetcher?: typeof fetch;
}>;

type ProviderName = "openai" | "gemini";

export class ReportNarrativeProviderError extends Error {
  readonly provider: ProviderName;
  readonly status: number;
  readonly code?: string;

  constructor(args: { provider: ProviderName; status: number; message: string; code?: string }) {
    super(args.message);
    this.name = "ReportNarrativeProviderError";
    this.provider = args.provider;
    this.status = args.status;
    this.code = args.code;
  }
}

const reportNarrativeSchema = {
  type: "object",
  additionalProperties: false,
  required: ["generatedAt", "blocks"],
  properties: {
    generatedAt: { type: "string" },
    blocks: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["blockId", "summary", "body", "evidenceIds", "caution", "suggestedActions"],
        properties: {
          blockId: { type: "string" },
          summary: { type: "string" },
          body: { type: "array", items: { type: "string" } },
          evidenceIds: { type: "array", items: { type: "string" } },
          caution: { type: "string" },
          suggestedActions: { type: "array", items: { type: "string" } },
        },
      },
    },
  },
} as const;

export function createOpenAiReportNarrativeProvider(options: OpenAiProviderOptions): ReportNarrativeProvider {
  const fetcher = options.fetcher ?? fetch;
  return {
    async generate(command) {
      const response = await fetcher("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${options.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: options.model,
          input: [
            {
              role: "system",
              content: [
                {
                  type: "input_text",
                  text: [
                    "당신은 Taglow Survey Admin의 보고서 초안 작성 도우미입니다.",
                    "한국어로 간결하고 운영적인 문장을 작성하세요.",
                    "제공된 N, 필터, 근거만 사용하고 새로운 사실을 만들지 마세요.",
                    "summary는 한 문장으로, body는 보고서 본문에 바로 들어갈 3-5개의 확장 문장으로 작성하세요.",
                    "body에는 해석, 근거, 운영상 의미를 포함하되 입력 evidence와 대표 원문을 벗어나지 마세요.",
                    "suggestedActions는 관리자가 실행할 수 있는 2-4개의 후속 조치로 작성하세요.",
                    "low sample 블록에는 caution을 반드시 작성하세요.",
                    "evidenceIds는 입력 evidence id 중에서만 선택하세요.",
                  ].join("\n"),
                },
              ],
            },
            {
              role: "user",
              content: [{ type: "input_text", text: JSON.stringify(command) }],
            },
          ],
          reasoning: { effort: "low" },
          text: {
            verbosity: "low",
            format: {
              type: "json_schema",
              name: "taglow_report_narrative",
              strict: true,
              schema: reportNarrativeSchema,
            },
          },
        }),
      });

      await assertProviderResponse(response, "openai");

      return parseReportNarrativeResult(await response.json());
    },
  };
}

export function createGeminiReportNarrativeProvider(options: GeminiProviderOptions): ReportNarrativeProvider {
  const fetcher = options.fetcher ?? fetch;
  const model = options.model.replace(/^models\//, "");
  return {
    async generate(command) {
      const response = await fetcher(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": options.apiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: [
                    "당신은 Taglow Survey Admin의 보고서 초안 작성 도우미입니다.",
                    "한국어로 간결하고 운영적인 문장을 작성하세요.",
                    "제공된 N, 필터, 근거만 사용하고 새로운 사실을 만들지 마세요.",
                    "summary는 한 문장으로, body는 보고서 본문에 바로 들어갈 3-5개의 확장 문장으로 작성하세요.",
                    "body에는 해석, 근거, 운영상 의미를 포함하되 입력 evidence와 대표 원문을 벗어나지 마세요.",
                    "suggestedActions는 관리자가 실행할 수 있는 2-4개의 후속 조치로 작성하세요.",
                    "low sample 블록에는 caution을 반드시 작성하세요.",
                    "low sample이 아닌 블록에 주의 문구가 필요 없으면 caution은 빈 문자열로 두세요.",
                    "evidenceIds는 입력 evidence id 중에서만 선택하세요.",
                    "",
                    "입력 JSON:",
                    JSON.stringify(command),
                  ].join("\n"),
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: "application/json",
            _responseJsonSchema: reportNarrativeSchema,
          },
        }),
      });

      await assertProviderResponse(response, "gemini");

      return parseReportNarrativeResult(await response.json());
    },
  };
}

export function parseReportNarrativeResult(payload: unknown): ReportNarrativeResult {
  const text = readOutputText(payload);
  if (!text) {
    throw new Error("AI response did not include output text.");
  }
  const parsed = JSON.parse(text) as ReportNarrativeResult;
  if (!parsed || !Array.isArray(parsed.blocks)) {
    throw new Error("AI response did not match report narrative schema.");
  }
  return parsed;
}

function readOutputText(payload: unknown): string {
  if (payload && typeof payload === "object" && "output_text" in payload && typeof payload.output_text === "string") {
    return payload.output_text;
  }
  const output = payload && typeof payload === "object" && "output" in payload ? (payload as { output?: unknown }).output : undefined;
  if (Array.isArray(output)) {
    for (const item of output) {
      const content = item && typeof item === "object" && "content" in item ? (item as { content?: unknown }).content : undefined;
      if (!Array.isArray(content)) continue;
      for (const part of content) {
        if (part && typeof part === "object" && "text" in part && typeof (part as { text?: unknown }).text === "string") {
          return (part as { text: string }).text;
        }
      }
    }
  }
  const candidates = payload && typeof payload === "object" && "candidates" in payload ? (payload as { candidates?: unknown }).candidates : undefined;
  if (Array.isArray(candidates)) {
    for (const candidate of candidates) {
      const content = candidate && typeof candidate === "object" && "content" in candidate ? (candidate as { content?: unknown }).content : undefined;
      const parts = content && typeof content === "object" && "parts" in content ? (content as { parts?: unknown }).parts : undefined;
      if (!Array.isArray(parts)) continue;
      const text = parts
        .map((part) => (part && typeof part === "object" && "text" in part && typeof (part as { text?: unknown }).text === "string" ? (part as { text: string }).text : ""))
        .join("")
        .trim();
      if (text) return stripJsonFence(text);
    }
  }
  return "";
}

async function assertProviderResponse(response: Response, provider: ProviderName): Promise<void> {
  if (response.ok) return;
  const body = await response.text();
  const parsed = readErrorRecord(body);
  const message = parsed.message || `${provider} response failed with status ${response.status}.`;
  throw new ReportNarrativeProviderError({
    provider,
    status: response.status,
    code: parsed.code,
    message,
  });
}

function readErrorRecord(body: string): { message?: string; code?: string } {
  try {
    const parsed = JSON.parse(body) as { error?: { message?: unknown; code?: unknown; status?: unknown; type?: unknown } };
    const error = parsed.error;
    if (!error) return {};
    return {
      message: typeof error.message === "string" ? error.message : undefined,
      code: typeof error.code === "string" ? error.code : typeof error.status === "string" ? error.status : typeof error.type === "string" ? error.type : undefined,
    };
  } catch {
    return body.trim() ? { message: body.slice(0, 240) } : {};
  }
}

function stripJsonFence(text: string): string {
  const match = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return match?.[1]?.trim() ?? text;
}
