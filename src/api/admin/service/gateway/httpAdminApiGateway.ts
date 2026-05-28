import { normalizeAdminApiError } from "./apiErrors";
import type { AdminApiGateway } from "./adminApiGateway";
import type {
  AnalysisQueryArgs,
  HeatmapQueryArgs,
  RawAdminAuthUser,
  RawAdminMember,
  RawBorichResult,
  RawCreateAssetPayload,
  RawCreateQuestionPayload,
  RawCreateSectionPayload,
  RawCreateSurveyPayload,
  RawFilterOptions,
  RawHeatmapPoint,
  RawQuestion,
  RawSection,
  RawSectionSummary,
  RawSurvey,
  RawSurveyAsset,
  RawTextAnswer,
  RawUpdateAssetPayload,
  RawUpdateQuestionPayload,
  RawUpdateSectionPayload,
  RawUpdateSurveyPayload,
  TextAnswerQueryArgs,
} from "./rawTypes";

export class HttpAdminApiGateway implements AdminApiGateway {
  constructor(private readonly options: { baseUrl: string; getAccessToken?: () => Promise<string | undefined> }) {}

  getCurrentAuthUser(): Promise<RawAdminAuthUser | null> {
    return this.request<RawAdminAuthUser | null>("/api/admin/session-user");
  }

  getCurrentAdmin(): Promise<RawAdminMember | null> {
    return this.request<RawAdminMember | null>("/api/admin/current-admin");
  }

  async signInWithGoogle(args: { redirectTo: string }): Promise<void> {
    const result = await this.request<{ redirectUrl?: string } | void>("/api/admin/auth/google", {
      method: "POST",
      body: args,
    });
    if (result && "redirectUrl" in result && result.redirectUrl) {
      window.location.assign(result.redirectUrl);
    }
  }

  signOut(): Promise<void> {
    return this.request<void>("/api/admin/auth/sign-out", { method: "POST" });
  }

  listSurveys(): Promise<RawSurvey[]> {
    return this.request<RawSurvey[]>("/api/admin/surveys");
  }

  getSurvey(surveyId: string): Promise<RawSurvey> {
    return this.request<RawSurvey>(`/api/admin/surveys/${surveyId}`);
  }

  createSurvey(payload: RawCreateSurveyPayload): Promise<RawSurvey> {
    return this.request<RawSurvey>("/api/admin/surveys", { method: "POST", body: payload });
  }

  updateSurvey(args: { surveyId: string; payload: RawUpdateSurveyPayload }): Promise<RawSurvey> {
    return this.request<RawSurvey>(`/api/admin/surveys/${args.surveyId}`, { method: "PATCH", body: args.payload });
  }

  deleteDraftSurvey(surveyId: string): Promise<void> {
    return this.request<void>(`/api/admin/surveys/${surveyId}`, { method: "DELETE" });
  }

  listSections(surveyId: string): Promise<RawSection[]> {
    return this.request<RawSection[]>(`/api/admin/surveys/${surveyId}/sections`);
  }

  createSection(payload: RawCreateSectionPayload): Promise<RawSection> {
    return this.request<RawSection>(`/api/admin/surveys/${payload.survey_id}/sections`, { method: "POST", body: payload });
  }

  createSections(payloads: RawCreateSectionPayload[]): Promise<RawSection[]> {
    if (!payloads.length) return Promise.resolve([]);
    return this.request<RawSection[]>(`/api/admin/surveys/${payloads[0]?.survey_id}/sections/bulk`, { method: "POST", body: { sections: payloads } });
  }

  updateSection(args: { sectionId: string; payload: RawUpdateSectionPayload }): Promise<RawSection> {
    return this.request<RawSection>(`/api/admin/sections/${args.sectionId}`, { method: "PATCH", body: args.payload });
  }

  deleteSection(sectionId: string): Promise<void> {
    return this.request<void>(`/api/admin/sections/${sectionId}`, { method: "DELETE" });
  }

  listQuestions(surveyId: string): Promise<RawQuestion[]> {
    return this.request<RawQuestion[]>(`/api/admin/surveys/${surveyId}/questions`);
  }

  createQuestion(payload: RawCreateQuestionPayload): Promise<RawQuestion> {
    return this.request<RawQuestion>(`/api/admin/surveys/${payload.survey_id}/questions`, { method: "POST", body: payload });
  }

  createQuestions(payloads: RawCreateQuestionPayload[]): Promise<RawQuestion[]> {
    if (!payloads.length) return Promise.resolve([]);
    return this.request<RawQuestion[]>(`/api/admin/surveys/${payloads[0]?.survey_id}/questions/bulk`, { method: "POST", body: { questions: payloads } });
  }

  updateQuestion(args: { questionId: string; payload: RawUpdateQuestionPayload }): Promise<RawQuestion> {
    return this.request<RawQuestion>(`/api/admin/questions/${args.questionId}`, { method: "PATCH", body: args.payload });
  }

  deleteQuestion(questionId: string): Promise<void> {
    return this.request<void>(`/api/admin/questions/${questionId}`, { method: "DELETE" });
  }

  listAssets(surveyId: string): Promise<RawSurveyAsset[]> {
    return this.request<RawSurveyAsset[]>(`/api/admin/surveys/${surveyId}/assets`);
  }

  createAssetMetadata(payload: RawCreateAssetPayload): Promise<RawSurveyAsset> {
    return this.request<RawSurveyAsset>(`/api/admin/surveys/${payload.survey_id}/assets`, { method: "POST", body: payload });
  }

  updateAssetMetadata(args: { assetId: string; payload: RawUpdateAssetPayload }): Promise<RawSurveyAsset> {
    return this.request<RawSurveyAsset>(`/api/admin/assets/${args.assetId}`, { method: "PATCH", body: args.payload });
  }

  deleteAsset(assetId: string): Promise<void> {
    return this.request<void>(`/api/admin/assets/${assetId}`, { method: "DELETE" });
  }

  publishSurvey(surveyId: string): Promise<RawSurvey> {
    return this.request<RawSurvey>(`/api/admin/surveys/${surveyId}/publish`, { method: "POST" });
  }

  closeSurvey(surveyId: string): Promise<RawSurvey> {
    return this.request<RawSurvey>(`/api/admin/surveys/${surveyId}/close`, { method: "POST" });
  }

  createNextSurveyVersion(surveyId: string): Promise<RawSurvey> {
    return this.request<RawSurvey>(`/api/admin/surveys/${surveyId}/versions`, { method: "POST" });
  }

  getFilterOptions(surveyId: string): Promise<RawFilterOptions> {
    return this.request<RawFilterOptions>(`/api/admin/surveys/${surveyId}/filter-options`);
  }

  getSectionSatisfactionSummary(args: AnalysisQueryArgs): Promise<RawSectionSummary[]> {
    return this.request<RawSectionSummary[]>(`/api/admin/surveys/${args.surveyId}/analysis/section-summary`, { method: "POST", body: args.filters });
  }

  getBorichSummary(args: AnalysisQueryArgs): Promise<RawBorichResult[]> {
    return this.request<RawBorichResult[]>(`/api/admin/surveys/${args.surveyId}/analysis/borich`, { method: "POST", body: args.filters });
  }

  getHeatmapPoints(args: HeatmapQueryArgs): Promise<RawHeatmapPoint[]> {
    return this.request<RawHeatmapPoint[]>(`/api/admin/surveys/${args.surveyId}/analysis/heatmap`, { method: "POST", body: args.filters });
  }

  listTextAnswers(args: TextAnswerQueryArgs): Promise<RawTextAnswer[]> {
    return this.request<RawTextAnswer[]>(`/api/admin/surveys/${args.surveyId}/analysis/text-answers`, { method: "POST", body: args.filters });
  }

  private async request<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
    try {
      const token = await this.options.getAccessToken?.();
      const response = await fetch(`${this.options.baseUrl}${path}`, {
        method: init.method ?? "GET",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: init.body === undefined ? undefined : JSON.stringify(init.body),
      });

      if (!response.ok) {
        throw new Error(`HTTP admin API failed: ${response.status}`);
      }

      if (response.status === 204) {
        return undefined as T;
      }

      return (await response.json()) as T;
    } catch (error) {
      throw normalizeAdminApiError(error);
    }
  }
}
