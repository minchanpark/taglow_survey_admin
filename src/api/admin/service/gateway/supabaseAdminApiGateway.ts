import { AdminApiError, normalizeAdminApiError } from "./apiErrors";
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
  RawInsertSurveyPayload,
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

type SupabaseResult<T> = PromiseLike<{ data: T | null; error: unknown }>;

type SupabaseClientLike = {
  auth: {
    getSession(): Promise<{
      data: { session: { user: { id: string; email?: string } } | null };
      error: unknown;
    }>;
    getUser(): Promise<{ data: { user: { id: string; email?: string } | null }; error: unknown }>;
    signInWithOAuth(args: {
      provider: "google";
      options: { redirectTo: string };
    }): Promise<{ data: unknown; error: unknown }>;
    signOut(): Promise<{ error: unknown }>;
  };
  storage?: {
    from(bucket: string): {
      createSignedUrl(path: string, expiresIn: number): Promise<{ data: { signedUrl?: string } | null; error: unknown }>;
    };
  };
  from(table: string): any;
  rpc(fn: string, args?: Record<string, unknown>): SupabaseResult<unknown>;
};

const RPC = {
  createNextSurveyVersion: "create_next_survey_version",
  filterOptions: "get_survey_filter_options",
  sectionSatisfactionSummary: "get_section_satisfaction_summary",
  borichSummary: "get_borich_summary",
  heatmapPoints: "get_heatmap_points",
  textAnswers: "get_text_answers",
} as const;

const deletableSurveyStatuses = ["draft", "closed", "archived"] as const;

export class SupabaseAdminApiGateway implements AdminApiGateway {
  constructor(private readonly supabase: SupabaseClientLike) {}

  async getCurrentAuthUser(): Promise<RawAdminAuthUser | null> {
    const { data, error } = await this.supabase.auth.getSession();
    if (error) {
      throw normalizeAdminApiError(error, "UNAUTHENTICATED");
    }

    return data.session?.user ? { id: data.session.user.id, email: data.session.user.email } : null;
  }

  async getCurrentAdmin(): Promise<RawAdminMember | null> {
    const { data: userData, error: userError } = await this.supabase.auth.getUser();
    if (userError) {
      throw normalizeAdminApiError(userError, "UNAUTHENTICATED");
    }

    const user = userData.user;
    if (!user) {
      return null;
    }

    const { data, error } = await this.supabase
      .from("admin_members")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (error) {
      throw normalizeAdminApiError(error, "ADMIN_ACCESS_DENIED");
    }

    return data as RawAdminMember | null;
  }

  async signInWithGoogle(args: { redirectTo: string }): Promise<void> {
    const { error } = await this.supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: args.redirectTo,
      },
    });

    if (error) {
      throw normalizeAdminApiError(error, "UNAUTHENTICATED");
    }
  }

  async signOut(): Promise<void> {
    const { error } = await this.supabase.auth.signOut();
    if (error) {
      throw normalizeAdminApiError(error, "UNAUTHENTICATED");
    }
  }

  listSurveys(): Promise<RawSurvey[]> {
    return this.many<RawSurvey>(
      this.supabase.from("surveys").select("*").order("updated_at", { ascending: false }),
    );
  }

  getSurvey(surveyId: string): Promise<RawSurvey> {
    return this.one<RawSurvey>(this.supabase.from("surveys").select("*").eq("id", surveyId).single(), "SURVEY_NOT_FOUND");
  }

  async createSurvey(payload: RawCreateSurveyPayload): Promise<RawSurvey> {
    const user = await this.getCurrentAuthUser();
    if (!user) {
      throw new AdminApiError("UNAUTHENTICATED", "Login is required to create a survey.");
    }

    const insertPayload: RawInsertSurveyPayload = {
      ...payload,
      created_by: user.id,
    };
    return this.one<RawSurvey>(this.supabase.from("surveys").insert(insertPayload).select("*").single());
  }

  updateSurvey(args: { surveyId: string; payload: RawUpdateSurveyPayload }): Promise<RawSurvey> {
    return this.one<RawSurvey>(
      this.supabase.from("surveys").update(args.payload).eq("id", args.surveyId).select("*").single(),
      "SURVEY_NOT_FOUND",
    );
  }

  async archiveSurvey(surveyId: string): Promise<RawSurvey> {
    const survey = await this.getSurvey(surveyId);
    if (survey.status !== "closed") {
      throw new AdminApiError("SURVEY_LOCKED_AFTER_PUBLISH", "Only closed surveys can be archived.");
    }

    return this.updateSurvey({
      surveyId,
      payload: { status: "archived" } as RawUpdateSurveyPayload,
    });
  }

  async deleteSurvey(surveyId: string): Promise<void> {
    const survey = await this.getSurvey(surveyId);
    if (!deletableSurveyStatuses.includes(survey.status as (typeof deletableSurveyStatuses)[number])) {
      throw new AdminApiError("SURVEY_LOCKED_AFTER_PUBLISH", "Only draft, closed, or archived surveys can be deleted.");
    }

    await this.empty(this.supabase.from("surveys").delete().eq("id", surveyId).in("status", deletableSurveyStatuses));
  }

  deleteDraftSurvey(surveyId: string): Promise<void> {
    return this.deleteSurvey(surveyId);
  }

  listSections(surveyId: string): Promise<RawSection[]> {
    return this.many<RawSection>(
      this.supabase.from("survey_sections").select("*").eq("survey_id", surveyId).order("order_index", { ascending: true }),
    );
  }

  createSection(payload: RawCreateSectionPayload): Promise<RawSection> {
    return this.one<RawSection>(this.supabase.from("survey_sections").insert(payload).select("*").single());
  }

  createSections(payloads: RawCreateSectionPayload[]): Promise<RawSection[]> {
    if (!payloads.length) return Promise.resolve([]);
    return this.many<RawSection>(this.supabase.from("survey_sections").insert(payloads).select("*"));
  }

  updateSection(args: { sectionId: string; payload: RawUpdateSectionPayload }): Promise<RawSection> {
    return this.one<RawSection>(
      this.supabase.from("survey_sections").update(args.payload).eq("id", args.sectionId).select("*").single(),
    );
  }

  async deleteSection(sectionId: string): Promise<void> {
    await this.empty(this.supabase.from("survey_sections").delete().eq("id", sectionId));
  }

  listQuestions(surveyId: string): Promise<RawQuestion[]> {
    return this.many<RawQuestion>(
      this.supabase.from("questions").select("*").eq("survey_id", surveyId).order("order_index", { ascending: true }),
    );
  }

  createQuestion(payload: RawCreateQuestionPayload): Promise<RawQuestion> {
    return this.one<RawQuestion>(this.supabase.from("questions").insert(payload).select("*").single());
  }

  createQuestions(payloads: RawCreateQuestionPayload[]): Promise<RawQuestion[]> {
    if (!payloads.length) return Promise.resolve([]);
    return this.many<RawQuestion>(this.supabase.from("questions").insert(payloads).select("*"));
  }

  updateQuestion(args: { questionId: string; payload: RawUpdateQuestionPayload }): Promise<RawQuestion> {
    return this.one<RawQuestion>(
      this.supabase.from("questions").update(args.payload).eq("id", args.questionId).select("*").single(),
    );
  }

  async deleteQuestion(questionId: string): Promise<void> {
    await this.empty(this.supabase.from("questions").delete().eq("id", questionId));
  }

  async listAssets(surveyId: string): Promise<RawSurveyAsset[]> {
    const rows = await this.many<RawSurveyAsset>(
      this.supabase.from("survey_assets").select("*").eq("survey_id", surveyId).order("created_at", { ascending: false }),
    );
    return Promise.all(rows.map((row) => this.withSignedAssetUrl(row)));
  }

  createAssetMetadata(payload: RawCreateAssetPayload): Promise<RawSurveyAsset> {
    return this.one<RawSurveyAsset>(this.supabase.from("survey_assets").insert(payload).select("*").single());
  }

  updateAssetMetadata(args: { assetId: string; payload: RawUpdateAssetPayload }): Promise<RawSurveyAsset> {
    return this.one<RawSurveyAsset>(
      this.supabase.from("survey_assets").update(args.payload).eq("id", args.assetId).select("*").single(),
    );
  }

  async deleteAsset(assetId: string): Promise<void> {
    await this.empty(this.supabase.from("survey_assets").delete().eq("id", assetId));
  }

  publishSurvey(surveyId: string): Promise<RawSurvey> {
    return this.updateSurvey({
      surveyId,
      payload: { status: "published", published_at: new Date().toISOString() } as RawUpdateSurveyPayload,
    });
  }

  closeSurvey(surveyId: string): Promise<RawSurvey> {
    return this.updateSurvey({
      surveyId,
      payload: { status: "closed", closed_at: new Date().toISOString() } as RawUpdateSurveyPayload,
    });
  }

  async createNextSurveyVersion(surveyId: string): Promise<RawSurvey> {
    return this.one<RawSurvey>(this.supabase.rpc(RPC.createNextSurveyVersion, { p_survey_id: surveyId }));
  }

  async getFilterOptions(surveyId: string): Promise<RawFilterOptions> {
    return this.one<RawFilterOptions>(this.supabase.rpc(RPC.filterOptions, { p_survey_id: surveyId }), "RPC_FAILED");
  }

  async getSectionSatisfactionSummary(args: AnalysisQueryArgs): Promise<RawSectionSummary[]> {
    return this.many<RawSectionSummary>(
      this.supabase.rpc(RPC.sectionSatisfactionSummary, {
        p_survey_id: args.surveyId,
        p_filters: args.filters,
      }),
      "RPC_FAILED",
    );
  }

  async getBorichSummary(args: AnalysisQueryArgs): Promise<RawBorichResult[]> {
    return this.many<RawBorichResult>(
      this.supabase.rpc(RPC.borichSummary, {
        p_survey_id: args.surveyId,
        p_filters: args.filters,
      }),
      "RPC_FAILED",
    );
  }

  async getHeatmapPoints(args: HeatmapQueryArgs): Promise<RawHeatmapPoint[]> {
    return this.many<RawHeatmapPoint>(
      this.supabase.rpc(RPC.heatmapPoints, {
        p_survey_id: args.surveyId,
        p_filters: args.filters,
      }),
      "RPC_FAILED",
    );
  }

  async listTextAnswers(args: TextAnswerQueryArgs): Promise<RawTextAnswer[]> {
    return this.many<RawTextAnswer>(
      this.supabase.rpc(RPC.textAnswers, {
        p_survey_id: args.surveyId,
        p_filters: args.filters,
      }),
      "RPC_FAILED",
    );
  }

  private async one<T>(query: SupabaseResult<unknown>, fallbackCode: "SURVEY_NOT_FOUND" | "RPC_FAILED" | "UNKNOWN" = "UNKNOWN"): Promise<T> {
    const { data, error } = await query;
    if (error) throw normalizeAdminApiError(error, fallbackCode);
    if (!data) throw new AdminApiError(fallbackCode, "Admin API expected one row but received none.");
    return data as T;
  }

  private async many<T>(query: SupabaseResult<unknown>, fallbackCode: "RPC_FAILED" | "UNKNOWN" = "UNKNOWN"): Promise<T[]> {
    const { data, error } = await query;
    if (error) throw normalizeAdminApiError(error, fallbackCode);
    return (data ?? []) as T[];
  }

  private async empty(query: SupabaseResult<unknown>): Promise<void> {
    const { error } = await query;
    if (error) throw normalizeAdminApiError(error);
  }

  private async withSignedAssetUrl(row: RawSurveyAsset): Promise<RawSurveyAsset> {
    const storage = this.supabase.storage;
    if (!storage) return row;

    try {
      const { data, error } = await storage.from(row.storage_bucket).createSignedUrl(row.storage_path, 60 * 60);
      if (error || !data?.signedUrl) return row;
      return {
        ...row,
        metadata: {
          ...(row.metadata ?? {}),
          signedUrl: data.signedUrl,
        },
      };
    } catch {
      return row;
    }
  }
}
