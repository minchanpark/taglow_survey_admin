import {
  ReportNarrativeProviderError,
  createGeminiReportNarrativeProvider,
  createOpenAiReportNarrativeProvider,
} from "./reportNarrativeProvider.ts";

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
  serve(handler: (request: Request) => Response | Promise<Response>): void;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, 405);
  }
  if (!request.headers.get("authorization")) {
    return jsonResponse({ error: "Authentication is required." }, 401);
  }

  try {
    const providerName = (Deno.env.get("REPORT_AI_PROVIDER") || "openai").toLowerCase();
    const provider = providerName === "gemini"
      ? createGeminiReportNarrativeProvider({
          apiKey: requireSecret("GEMINI_API_KEY"),
          model: Deno.env.get("GEMINI_REPORT_MODEL") || "gemini-2.5-flash",
        })
      : createOpenAiReportNarrativeProvider({
          apiKey: requireSecret("OPENAI_API_KEY"),
          model: Deno.env.get("OPENAI_REPORT_MODEL") || "gpt-5-mini",
        });
    const command = await request.json();
    return jsonResponse(await provider.generate(command), 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate report narrative.";
    if (error instanceof ReportNarrativeProviderError) {
      return jsonResponse(
        {
          error: message,
          provider: error.provider,
          providerStatus: error.status,
          providerCode: error.code,
        },
        502,
      );
    }
    return jsonResponse({ error: message }, 500);
  }
});

function requireSecret(name: string): string {
  const value = Deno.env.get(name);
  if (!value) {
    throw new Error(`${name} is not configured.`);
  }
  return value;
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}
