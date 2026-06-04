import { AdminApiError, normalizeAdminApiError } from "./apiErrors";
import type { AdminApiGateway } from "./adminApiGateway";
import type { JsonRecord } from "../../model";
import type {
  AnalysisQueryArgs,
  HeatmapQueryArgs,
  IdentityResponseQueryArgs,
  RawChoiceDistribution,
  RawGroupCompareResult,
  RawAdminAuthUser,
  RawAdminMember,
  RawBorichResult,
  RawCreateAssetPayload,
  RawCreateSurveyCollaboratorPayload,
  RawCreateQuestionPayload,
  RawCreateSectionPayload,
  RawCreateSurveyPayload,
  RawFilterOptions,
  RawHeatmapPoint,
  RawImageTagAnswer,
  RawIdentityResponse,
  RawLocusPoint,
  RawPaginatedResult,
  RawPriorityIssue,
  RawInsertSurveyPayload,
  RawQuestion,
  RawQuestionSummary,
  RawResponseSummary,
  RawSection,
  RawSectionSummary,
  RawSurvey,
  RawSurveyAsset,
  RawSurveyCollaborator,
  RawTextAnswer,
  RawTextGroup,
  RawUpdateAssetPayload,
  RawUpdateSurveyCollaboratorPayload,
  RawUpdateQuestionPayload,
  RawUpdateSectionPayload,
  RawUpdateSurveyPayload,
  TextAnswerQueryArgs,
} from "./rawTypes";

type SupabaseResult<T> = PromiseLike<{ data: T | null; error: unknown }>;

type RawAnalysisResponseRow = Readonly<{
  status?: string | null;
  passed_attention_check?: boolean | null;
  gender?: string | null;
  semester_group?: string | null;
  department?: string | null;
  rc?: string | null;
  dormitory?: string | null;
  room_type?: string | null;
  dorm_experience?: string | null;
  profile_json?: JsonRecord | null;
  raw_payload?: JsonRecord | null;
}>;

type ProfileOptionRow = Readonly<{
  value: string;
  label: string;
  orderIndex: number;
}>;

type ProfileDistributionRow = Readonly<{
  key: string;
  label: string;
  n: number;
  percentage: number;
  isUnclassified: boolean;
}>;

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
  requestAdminAccess: "request_admin_access",
  listPendingAdminMembers: "list_pending_admin_members",
  listActiveAdminMembers: "list_active_admin_members",
  approveAdminMember: "approve_admin_member",
  updateAdminMemberRole: "update_admin_member_role",
  deleteAdminMember: "delete_admin_member",
  createNextSurveyVersion: "create_next_survey_version",
  filterOptions: "get_survey_filter_options",
  responseSummary: "get_response_summary",
  sectionSatisfactionSummary: "get_section_satisfaction_summary",
  questionSatisfactionSummary: "get_question_satisfaction_summary",
  choiceDistribution: "get_choice_distribution",
  groupCompareSummary: "get_group_compare_summary",
  priorityTop5: "get_priority_top5",
  borichSummary: "get_borich_summary",
  locusSummary: "get_locus_summary",
  heatmapPoints: "get_heatmap_points",
  imageTagAnswers: "get_image_tag_answers",
  textGroups: "get_text_groups",
  textAnswers: "get_text_answers",
  identityResponses: "get_identity_responses",
  hasAccessibleSurveys: "has_accessible_surveys",
  listAccessibleSurveys: "list_accessible_surveys",
  getAccessibleSurvey: "get_accessible_survey",
} as const;

const deletableSurveyStatuses = ["draft", "closed", "archived"] as const;

export class SupabaseAdminApiGateway implements AdminApiGateway {
  constructor(
    private readonly supabase: SupabaseClientLike,
    private readonly storageBucket = "survey-assets",
  ) {}

  async getCurrentAuthUser(): Promise<RawAdminAuthUser | null> {
    const { data, error } = await this.supabase.auth.getSession();
    if (error) {
      throw normalizeAdminApiError(error, "UNAUTHENTICATED");
    }

    return data.session?.user ? { id: data.session.user.id, email: data.session.user.email } : null;
  }

  async getOwnAdminMember(): Promise<RawAdminMember | null> {
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
      .maybeSingle();

    if (error) {
      throw normalizeAdminApiError(error, "ADMIN_ACCESS_DENIED");
    }

    return data as RawAdminMember | null;
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
      .in("role", ["super_admin", "admin"])
      .maybeSingle();

    if (error) {
      throw normalizeAdminApiError(error, "ADMIN_ACCESS_DENIED");
    }

    return data as RawAdminMember | null;
  }

  async requestAdminAccess(): Promise<RawAdminMember> {
    return this.one<RawAdminMember>(this.supabase.rpc(RPC.requestAdminAccess), "ADMIN_ACCESS_DENIED");
  }

  async listPendingAdminMembers(): Promise<RawAdminMember[]> {
    return this.many<RawAdminMember>(this.supabase.rpc(RPC.listPendingAdminMembers), "ADMIN_ACCESS_DENIED");
  }

  async listActiveAdminMembers(): Promise<RawAdminMember[]> {
    return this.many<RawAdminMember>(this.supabase.rpc(RPC.listActiveAdminMembers), "ADMIN_ACCESS_DENIED");
  }

  async approveAdminMember(args: { memberId: string; role: "admin" }): Promise<RawAdminMember> {
    return this.one<RawAdminMember>(
      this.supabase.rpc(RPC.approveAdminMember, {
        p_member_id: args.memberId,
        p_role: args.role,
      }),
      "ADMIN_ACCESS_DENIED",
    );
  }

  async updateAdminMemberRole(args: { memberId: string; role: "super_admin" }): Promise<RawAdminMember> {
    return this.one<RawAdminMember>(
      this.supabase.rpc(RPC.updateAdminMemberRole, {
        p_member_id: args.memberId,
        p_role: args.role,
      }),
      "ADMIN_ACCESS_DENIED",
    );
  }

  async deleteAdminMember(args: { memberId: string }): Promise<void> {
    await this.empty(
      this.supabase.rpc(RPC.deleteAdminMember, {
        p_member_id: args.memberId,
      }),
    );
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

  async listSurveys(): Promise<RawSurvey[]> {
    await this.requireCurrentAuthUser();
    return this.many<RawSurvey>(this.supabase.rpc(RPC.listAccessibleSurveys));
  }

  async getSurvey(surveyId: string): Promise<RawSurvey> {
    await this.requireCurrentAuthUser();
    return this.one<RawSurvey>(this.supabase.rpc(RPC.getAccessibleSurvey, { p_survey_id: surveyId }), "SURVEY_NOT_FOUND");
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

  async hasAccessibleSurveys(): Promise<boolean> {
    const { data, error } = await this.supabase.rpc(RPC.hasAccessibleSurveys);
    if (error) throw normalizeAdminApiError(error);
    return Boolean(data);
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

  listSurveyCollaborators(surveyId: string): Promise<RawSurveyCollaborator[]> {
    return this.many<RawSurveyCollaborator>(
      this.supabase
        .from("survey_collaborators")
        .select("*")
        .eq("survey_id", surveyId)
        .is("revoked_at", null)
        .order("created_at", { ascending: false }),
    );
  }

  async createSurveyCollaborator(payload: RawCreateSurveyCollaboratorPayload): Promise<RawSurveyCollaborator> {
    return this.one<RawSurveyCollaborator>(this.supabase.from("survey_collaborators").insert(payload).select("*").single());
  }

  updateSurveyCollaborator(args: { collaboratorId: string; payload: RawUpdateSurveyCollaboratorPayload }): Promise<RawSurveyCollaborator> {
    return this.one<RawSurveyCollaborator>(
      this.supabase.from("survey_collaborators").update(args.payload).eq("id", args.collaboratorId).select("*").single(),
    );
  }

  async getFilterOptions(surveyId: string): Promise<RawFilterOptions> {
    return this.one<RawFilterOptions>(this.supabase.rpc(RPC.filterOptions, { p_survey_id: surveyId }), "RPC_FAILED");
  }

  async getResponseSummary(args: AnalysisQueryArgs): Promise<RawResponseSummary> {
    try {
      return await this.one<RawResponseSummary>(
        this.supabase.rpc(RPC.responseSummary, {
          p_survey_id: args.surveyId,
          p_filters: args.filters,
        }),
        "RPC_FAILED",
      );
    } catch (error) {
      if (!isMissingRpcError(error, RPC.responseSummary)) {
        throw error;
      }
    }

    const [responses, questions] = await Promise.all([this.listResponseRowsForSummary(args.surveyId), this.listQuestions(args.surveyId)]);
    return buildRawResponseSummary(responses, questions, args.filters);
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

  async getQuestionSatisfactionSummary(args: AnalysisQueryArgs): Promise<RawQuestionSummary[]> {
    return this.many<RawQuestionSummary>(
      this.supabase.rpc(RPC.questionSatisfactionSummary, {
        p_survey_id: args.surveyId,
        p_filters: args.filters,
      }),
      "RPC_FAILED",
    );
  }

  async getChoiceDistribution(args: AnalysisQueryArgs): Promise<RawChoiceDistribution[]> {
    return this.many<RawChoiceDistribution>(
      this.supabase.rpc(RPC.choiceDistribution, {
        p_survey_id: args.surveyId,
        p_filters: args.filters,
      }),
      "RPC_FAILED",
    );
  }

  async getGroupCompareSummary(args: AnalysisQueryArgs): Promise<RawGroupCompareResult[]> {
    return this.many<RawGroupCompareResult>(
      this.supabase.rpc(RPC.groupCompareSummary, {
        p_survey_id: args.surveyId,
        p_filters: args.filters,
      }),
      "RPC_FAILED",
    );
  }

  async getPriorityTop5(args: AnalysisQueryArgs): Promise<RawPriorityIssue[]> {
    return this.many<RawPriorityIssue>(
      this.supabase.rpc(RPC.priorityTop5, {
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

  async getLocusSummary(args: AnalysisQueryArgs): Promise<RawLocusPoint[]> {
    return this.many<RawLocusPoint>(
      this.supabase.rpc(RPC.locusSummary, {
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

  async listImageTagAnswers(args: HeatmapQueryArgs): Promise<RawPaginatedResult<RawImageTagAnswer>> {
    try {
      const rows = await this.many<RawImageTagAnswer>(
        this.supabase.rpc(RPC.imageTagAnswers, {
          p_survey_id: args.surveyId,
          p_filters: args.filters,
        }),
        "RPC_FAILED",
      );
      const signedRows = await Promise.all(rows.map((row) => this.withImageTagAnswerSignedUrl(row)));
      return toRawPage(signedRows);
    } catch (error) {
      if (!isMissingRpcError(error, RPC.imageTagAnswers)) {
        throw error;
      }
    }

    try {
      return toRawPage(await this.listImageTagAnswersWithResponseRelation(args, "responses!answers_response_same_survey_fk!inner"));
    } catch (error) {
      if (!isMissingRelationshipError(error)) {
        throw error;
      }
      return toRawPage(await this.listImageTagAnswersWithResponseRelation(args, "responses!inner"));
    }
  }

  async listIdentityResponses(args: IdentityResponseQueryArgs): Promise<RawPaginatedResult<RawIdentityResponse>> {
    try {
      const rows = await this.many<RawIdentityResponse>(
        this.supabase.rpc(RPC.identityResponses, {
          p_survey_id: args.surveyId,
          p_filters: args.filters,
        }),
        "RPC_FAILED",
      );
      return toRawPage(rows);
    } catch (error) {
      if (!isMissingRpcError(error, RPC.identityResponses)) {
        throw error;
      }
    }

    try {
      return toRawPage(await this.listIdentityResponsesWithResponseRelation(args, "responses!answers_response_same_survey_fk!inner"));
    } catch (error) {
      if (!isMissingRelationshipError(error)) {
        throw error;
      }
      return toRawPage(await this.listIdentityResponsesWithResponseRelation(args, "responses!inner"));
    }
  }

  private async listImageTagAnswersWithResponseRelation(
    args: HeatmapQueryArgs,
    responseRelation: string,
  ): Promise<RawImageTagAnswer[]> {
    const filters = args.filters;
    let query = this.supabase
      .from("answers")
      .select(
        `
          id,
          response_id,
          section_id,
          question_id,
          asset_id,
          answer_type,
          x_ratio,
          y_ratio,
          tag_type,
          severity,
          text_value,
          value_json,
          created_at,
          ${responseRelation}(
            status,
            passed_attention_check,
            gender,
            semester_group,
            department,
            rc,
            dormitory,
            room_type,
            dorm_experience
          ),
          questions(
            question_type,
            title_ko
          ),
          survey_assets(
            storage_bucket,
            storage_path,
            metadata
          ),
          survey_sections(
            title_ko
          )
        `,
      )
      .eq("survey_id", args.surveyId)
      .in("answer_type", ["image_tag", "participant_image_tag"])
      .eq("responses.status", "submitted")
      .eq("responses.passed_attention_check", true)
      .order("created_at", { ascending: false });

    query = applyMaybeEq(query, "responses.gender", filters.gender);
    query = applyMaybeEq(query, "responses.semester_group", filters.semester_group);
    query = applyMaybeEq(query, "responses.department", filters.department);
    query = applyMaybeEq(query, "responses.rc", filters.rc);
    query = applyMaybeEq(query, "responses.dormitory", filters.dormitory);
    query = applyMaybeEq(query, "responses.room_type", filters.room_type);
    query = applyMaybeEq(query, "responses.dorm_experience", filters.dorm_experience);
    query = applyMaybeEq(query, "section_id", filters.section_id);
    query = applyMaybeEq(query, "topic_key", filters.topic_key);
    query = applyMaybeEq(query, "space_key", filters.space_key);
    query = applyMaybeEq(query, "asset_id", filters.asset_id);
    query = applyMaybeEq(query, "tag_type", filters.tag_type);

    const rows = await this.many<Record<string, unknown>>(query, "RPC_FAILED");
    return Promise.all(rows.map((row) => this.toRawImageTagAnswer(row)));
  }

  private async listIdentityResponsesWithResponseRelation(
    args: IdentityResponseQueryArgs,
    responseRelation: string,
  ): Promise<RawIdentityResponse[]> {
    const filters = args.filters;
    const limit = getPageSize(filters.limit, 100, 200);
    let query = this.supabase
      .from("answers")
      .select(
        `
          response_id,
          text_value,
          value_json,
          created_at,
          ${responseRelation}(
            id,
            status,
            submitted_at,
            passed_attention_check,
            gender,
            semester_group,
            department,
            rc,
            dormitory,
            room_type,
            dorm_experience
          ),
          questions(
            question_key,
            question_type,
            title_ko,
            title_en,
            config
          )
        `,
      )
      .eq("survey_id", args.surveyId)
      .eq("responses.status", "submitted")
      .eq("responses.passed_attention_check", true)
      .order("created_at", { ascending: false })
      .limit(Math.min(limit * 4, 500));

    query = applyMaybeEq(query, "responses.gender", filters.gender);
    query = applyMaybeEq(query, "responses.semester_group", filters.semester_group);
    query = applyMaybeEq(query, "responses.department", filters.department);
    query = applyMaybeEq(query, "responses.rc", filters.rc);
    query = applyMaybeEq(query, "responses.dormitory", filters.dormitory);
    query = applyMaybeEq(query, "responses.room_type", filters.room_type);
    query = applyMaybeEq(query, "responses.dorm_experience", filters.dorm_experience);

    const rows = await this.many<Record<string, unknown>>(query, "RPC_FAILED");
    return toRawIdentityResponsePage(rows, limit);
  }

  async getTextGroups(args: TextAnswerQueryArgs): Promise<RawTextGroup[]> {
    return this.many<RawTextGroup>(
      this.supabase.rpc(RPC.textGroups, {
        p_survey_id: args.surveyId,
        p_filters: args.filters,
      }),
      "RPC_FAILED",
    );
  }

  async listTextAnswers(args: TextAnswerQueryArgs): Promise<RawPaginatedResult<RawTextAnswer>> {
    const rows = await this.many<RawTextAnswer>(
      this.supabase.rpc(RPC.textAnswers, {
        p_survey_id: args.surveyId,
        p_filters: args.filters,
      }),
      "RPC_FAILED",
    );
    return toRawPage(rows);
  }

  private async one<T>(
    query: SupabaseResult<unknown>,
    fallbackCode: "SURVEY_NOT_FOUND" | "ADMIN_ACCESS_DENIED" | "RPC_FAILED" | "UNKNOWN" = "UNKNOWN",
  ): Promise<T> {
    const { data, error } = await query;
    if (error) throw normalizeAdminApiError(error, fallbackCode);
    if (!data) throw new AdminApiError(fallbackCode, "Admin API expected one row but received none.");
    if (Array.isArray(data)) {
      const [first] = data;
      if (!first) throw new AdminApiError(fallbackCode, "Admin API expected one row but received none.");
      return first as T;
    }
    return data as T;
  }

  private async requireCurrentAuthUser(): Promise<RawAdminAuthUser> {
    const user = await this.getCurrentAuthUser();
    if (!user) {
      throw new AdminApiError("UNAUTHENTICATED", "Login is required for the admin API.");
    }
    return user;
  }

  private async listResponseRowsForSummary(surveyId: string): Promise<RawAnalysisResponseRow[]> {
    try {
      return await this.many<RawAnalysisResponseRow>(
        this.supabase
          .from("responses")
          .select("status, passed_attention_check, gender, semester_group, department, rc, dormitory, room_type, dorm_experience, profile_json, raw_payload")
          .eq("survey_id", surveyId),
        "RPC_FAILED",
      );
    } catch (error) {
      if (!isMissingColumnError(error, ["passed_attention_check", "profile_json", "raw_payload"])) {
        throw error;
      }
      return this.many<RawAnalysisResponseRow>(
        this.supabase
          .from("responses")
          .select("status, gender, semester_group, department, rc, dormitory, room_type, dorm_experience")
          .eq("survey_id", surveyId),
        "RPC_FAILED",
      );
    }
  }

  private async many<T>(
    query: SupabaseResult<unknown>,
    fallbackCode: "ADMIN_ACCESS_DENIED" | "RPC_FAILED" | "UNKNOWN" = "UNKNOWN",
  ): Promise<T[]> {
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

  private async toRawImageTagAnswer(row: Record<string, unknown>): Promise<RawImageTagAnswer> {
    const response = getRelationRecord(row.responses);
    const question = getRelationRecord(row.questions);
    const asset = getRelationRecord(row.survey_assets);
    const section = getRelationRecord(row.survey_sections);
    const valueJson = isJsonRecord(row.value_json) ? row.value_json : {};
    const rawImage = getStoredImage(row.value_json, this.storageBucket) ?? getStoredImage(asset, this.storageBucket);
    const signedUrl = rawImage?.storageBucket && rawImage.storagePath
      ? await this.createSignedUrl(rawImage.storageBucket, rawImage.storagePath) ?? rawImage.signedUrl
      : rawImage?.signedUrl;

    return {
      answer_id: getString(row.id),
      id: getString(row.id),
      response_id: getString(row.response_id),
      section_id: getString(row.section_id) ?? null,
      section_title: getString(section?.title_ko) ?? null,
      question_id: getString(row.question_id) ?? null,
      question_title: getString(question?.title_ko) ?? null,
      question_type: getString(question?.question_type) ?? null,
      asset_id: getString(row.asset_id) ?? null,
      answer_type: getString(row.answer_type) ?? "image_tag",
      x_ratio: getNumber(row.x_ratio),
      y_ratio: getNumber(row.y_ratio),
      tag_type: getString(row.tag_type) ?? null,
      severity: getNumber(row.severity),
      text_value: getString(row.text_value) ?? null,
      value_json: valueJson,
      image_storage_bucket: rawImage?.storageBucket ?? null,
      image_storage_path: rawImage?.storagePath ?? null,
      image_signed_url: signedUrl ?? null,
      dormitory: getString(response?.dormitory) ?? null,
      room_type: getString(response?.room_type) ?? null,
      rc: getString(response?.rc) ?? null,
      department: getString(response?.department) ?? null,
      response_profile: compactRecord({
        gender: getString(response?.gender),
        semesterGroup: getString(response?.semester_group),
        department: getString(response?.department),
        rc: getString(response?.rc),
        dormitory: getString(response?.dormitory),
        roomType: getString(response?.room_type),
        dormExperience: getString(response?.dorm_experience),
      }),
      created_at: getString(row.created_at) ?? "",
    };
  }

  private async withImageTagAnswerSignedUrl(row: RawImageTagAnswer): Promise<RawImageTagAnswer> {
    if (row.image_signed_url || !row.image_storage_bucket || !row.image_storage_path) return row;
    const signedUrl = await this.createSignedUrl(row.image_storage_bucket, row.image_storage_path);
    return signedUrl ? { ...row, image_signed_url: signedUrl } : row;
  }

  private async createSignedUrl(bucket: string, path: string): Promise<string | undefined> {
    const storage = this.supabase.storage;
    if (!storage) return undefined;

    try {
      const { data, error } = await storage.from(bucket).createSignedUrl(path, 60 * 60);
      if (error || !data?.signedUrl) return undefined;
      return data.signedUrl;
    } catch {
      return undefined;
    }
  }
}

function applyMaybeEq(query: any, column: string, value: unknown): any {
  return typeof value === "string" && value.trim() ? query.eq(column, value) : query;
}

function getPageSize(value: unknown, defaultValue: number, maxValue: number): number {
  const numberValue = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numberValue)) return defaultValue;
  return Math.min(Math.max(Math.trunc(numberValue), 1), maxValue);
}

function toRawPage<T extends { next_cursor?: string | null }>(rows: T[]): RawPaginatedResult<T> {
  const nextCursor = rows.find((row) => typeof row.next_cursor === "string" && row.next_cursor.trim())?.next_cursor ?? null;
  return {
    items: rows.map(({ next_cursor: _nextCursor, ...row }) => row as T),
    next_cursor: nextCursor,
  };
}

function toRawIdentityResponsePage(rows: readonly Record<string, unknown>[], limit: number): RawIdentityResponse[] {
  const byResponse = new Map<string, RawIdentityResponse>();
  for (const row of rows) {
    const response = getRelationRecord(row.responses);
    const responseId = getString(response?.id) ?? getString(row.response_id);
    if (!responseId) continue;
    const identityKey = getIdentityQuestionKey(getRelationRecord(row.questions));
    if (!identityKey) continue;

    const answerValue = getIdentityAnswerValue(row);
    if (!answerValue) continue;

    const existing = byResponse.get(responseId);
    const next: RawIdentityResponse = {
      response_id: responseId,
      student_number: identityKey === "student_number" ? answerValue : existing?.student_number ?? null,
      name: identityKey === "name" ? answerValue : existing?.name ?? null,
      gender: getString(response?.gender) ?? null,
      semester_group: getString(response?.semester_group) ?? null,
      department: getString(response?.department) ?? null,
      rc: getString(response?.rc) ?? null,
      dormitory: getString(response?.dormitory) ?? null,
      room_type: getString(response?.room_type) ?? null,
      dorm_experience: getString(response?.dorm_experience) ?? null,
      submitted_at: getString(response?.submitted_at) ?? getString(row.created_at) ?? "",
      next_cursor: null,
    };
    byResponse.set(responseId, next);
  }

  const items = [...byResponse.values()]
    .filter((item) => Boolean(item.student_number || item.name))
    .sort((a, b) => b.submitted_at.localeCompare(a.submitted_at))
    .slice(0, limit);
  return items;
}

function buildRawResponseSummary(
  responses: readonly RawAnalysisResponseRow[],
  questions: readonly RawQuestion[],
  filters: JsonRecord,
): RawResponseSummary {
  const submitted = responses.filter((response) => response.status === "submitted" && response.passed_attention_check !== false);
  const filtered = submitted.filter((response) => matchesResponseFilters(response, filters));
  const profileOptions = buildProfileOptionsByDimension(questions);
  const lowSampleThreshold = 10;

  const profileDistribution = {
    gender: buildProfileDistribution(filtered, profileOptions.gender ?? [], "gender"),
    semesterGroups: buildProfileDistribution(filtered, profileOptions.semester_group ?? [], "semester_group"),
    department: buildProfileDistribution(filtered, profileOptions.department ?? [], "department"),
    rc: buildProfileDistribution(filtered, profileOptions.rc ?? [], "rc"),
    dormitory: buildProfileDistribution(filtered, profileOptions.dormitory ?? [], "dormitory"),
    roomType: buildProfileDistribution(filtered, profileOptions.room_type ?? [], "room_type"),
    dormExperience: buildProfileDistribution(filtered, profileOptions.dorm_experience ?? [], "dorm_experience"),
  };

  return {
    total_responses: responses.length,
    submitted_responses: submitted.length,
    filtered_responses: filtered.length,
    low_sample_threshold: lowSampleThreshold,
    is_low_sample: filtered.length > 0 && filtered.length < lowSampleThreshold,
    profile_distribution: profileDistribution,
    low_sample_groups: buildLowSampleGroups(profileDistribution, lowSampleThreshold),
  };
}

function buildProfileOptionsByDimension(questions: readonly RawQuestion[]): Record<string, ProfileOptionRow[]> {
  const byDimension: Record<string, ProfileOptionRow[]> = {};
  const sortedQuestions = [...questions]
    .filter((question) => question.question_type === "profile")
    .sort((a, b) => a.order_index - b.order_index);

  for (const question of sortedQuestions) {
    const config = getRelationRecord(question.config);
    const dimension = normalizeProfileFieldKey(getString(config?.profileField) ?? getString(config?.profile_field));
    if (!dimension || byDimension[dimension]) continue;
    const rawOptions = Array.isArray(config?.options) ? config.options : [];
    const options: ProfileOptionRow[] = [];
    const seen = new Set<string>();
    rawOptions.forEach((rawOption, optionIndex) => {
      const option = getRelationRecord(rawOption);
      const value =
        getString(option?.value) ??
        getString(option?.labelKo) ??
        getString(option?.label) ??
        getString(option?.labelEn);
      if (!value || seen.has(value)) return;
      seen.add(value);
      options.push({
        value,
        label: getString(option?.labelKo) ?? getString(option?.label) ?? getString(option?.labelEn) ?? value,
        orderIndex: question.order_index * 1000 + optionIndex,
      });
    });
    byDimension[dimension] = options;
  }

  return byDimension;
}

function buildProfileDistribution(
  responses: readonly RawAnalysisResponseRow[],
  options: readonly ProfileOptionRow[],
  dimension: string,
): ProfileDistributionRow[] {
  const canonicalValues = new Set(options.map((option) => option.value));
  const counts = new Map<string, number>();
  for (const response of responses) {
    const rawValue = getResponseDimensionValue(response, dimension);
    const value = rawValue ? canonicalValues.size > 0 && !canonicalValues.has(rawValue) ? "기타/미분류" : rawValue : "기타/미분류";
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  const total = responses.length;
  const rows: ProfileDistributionRow[] = options.map((option) => ({
    key: option.value,
    label: option.label,
    n: counts.get(option.value) ?? 0,
    percentage: percentage(counts.get(option.value) ?? 0, total),
    isUnclassified: false,
  }));
  const unclassifiedCount = counts.get("기타/미분류") ?? 0;
  if (unclassifiedCount > 0) {
    rows.push({
      key: "기타/미분류",
      label: "기타/미분류",
      n: unclassifiedCount,
      percentage: percentage(unclassifiedCount, total),
      isUnclassified: true,
    });
  }

  if (!options.length) {
    const actualRows = [...counts.entries()]
      .filter(([key]) => key !== "기타/미분류")
      .sort(([left], [right]) => left.localeCompare(right, "ko"))
      .map(([key, n]) => ({
        key,
        label: key,
        n,
        percentage: percentage(n, total),
        isUnclassified: false,
      }));
    const unclassifiedRow = unclassifiedCount > 0
      ? [{
          key: "기타/미분류",
          label: "기타/미분류",
          n: unclassifiedCount,
          percentage: percentage(unclassifiedCount, total),
          isUnclassified: true,
        }]
      : [];
    return [...actualRows, ...unclassifiedRow];
  }

  return rows;
}

function buildLowSampleGroups(
  distribution: NonNullable<RawResponseSummary["profile_distribution"]>,
  threshold: number,
): NonNullable<RawResponseSummary["low_sample_groups"]> {
  const dimensions = [
    ["gender", "gender"],
    ["semesterGroup", "semesterGroups"],
    ["department", "department"],
    ["rc", "rc"],
    ["dormitory", "dormitory"],
    ["roomType", "roomType"],
    ["dormExperience", "dormExperience"],
  ] as const;

  return dimensions.flatMap(([dimension, key]) => {
    const rows = distribution[key];
    return Array.isArray(rows)
      ? rows
          .filter((row): row is ProfileDistributionRow => isProfileDistributionRow(row) && row.n > 0 && row.n < threshold)
          .map((row) => ({ dimension, label: row.label, n: row.n }))
      : [];
  });
}

function matchesResponseFilters(response: RawAnalysisResponseRow, filters: JsonRecord): boolean {
  return (
    matchesFilter(getResponseDimensionValue(response, "gender"), getFilterValue(filters, "gender")) &&
    matchesFilter(getResponseDimensionValue(response, "semester_group"), getFilterValue(filters, "semester_group")) &&
    matchesFilter(getResponseDimensionValue(response, "department"), getFilterValue(filters, "department")) &&
    matchesFilter(getResponseDimensionValue(response, "rc"), getFilterValue(filters, "rc")) &&
    matchesFilter(getResponseDimensionValue(response, "dormitory"), getFilterValue(filters, "dormitory")) &&
    matchesFilter(getResponseDimensionValue(response, "room_type"), getFilterValue(filters, "room_type")) &&
    matchesFilter(getResponseDimensionValue(response, "dorm_experience"), getFilterValue(filters, "dorm_experience"))
  );
}

function getFilterValue(filters: JsonRecord, dimension: string): unknown {
  if (dimension === "semester_group") return filters.semester_group ?? filters.semesterGroup;
  if (dimension === "room_type") return filters.room_type ?? filters.roomType;
  if (dimension === "dorm_experience") return filters.dorm_experience ?? filters.dormExperience;
  return filters[dimension];
}

function matchesFilter(value: unknown, filter: unknown): boolean {
  const normalizedFilter = getString(filter);
  return !normalizedFilter || getString(value) === normalizedFilter;
}

function normalizeProfileFieldKey(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const normalized = value.trim().replace(/[\s-]+/g, "_");
  if (!normalized) return undefined;
  const compact = normalized.replace(/_/g, "").toLowerCase();
  if (compact === "studentnumber" || compact === "studentid") return "student_number";
  if (compact === "name" || compact === "fullname") return "name";
  if (compact === "gender") return "gender";
  if (compact === "semester" || compact === "semestergroup") return "semester_group";
  if (compact === "department") return "department";
  if (compact === "rc") return "rc";
  if (compact === "dormitory") return "dormitory";
  if (compact === "roomtype") return "room_type";
  if (compact === "dormexperience") return "dorm_experience";
  return undefined;
}

function getIdentityQuestionKey(question: Record<string, unknown> | undefined): "student_number" | "name" | undefined {
  if (!question) return undefined;
  const config = getRelationRecord(question.config);
  const profileField = normalizeProfileFieldKey(getString(config?.profileField) ?? getString(config?.profile_field));
  if (profileField === "student_number" || profileField === "name") return profileField;

  const questionKey = normalizeIdentityText(getString(question.question_key));
  const titleKo = normalizeIdentityText(getString(question.title_ko));
  const titleEn = normalizeIdentityText(getString(question.title_en));
  if (questionKey.includes("studentnumber") || questionKey.includes("studentid") || titleKo === "학번" || titleEn.includes("studentid")) {
    return "student_number";
  }
  if (questionKey === "name" || questionKey.endsWith("name") || titleKo === "이름" || titleEn === "name" || titleEn.includes("fullname")) {
    return "name";
  }
  return undefined;
}

function getIdentityAnswerValue(row: Record<string, unknown>): string | undefined {
  const valueJson = getRelationRecord(row.value_json);
  return firstString(row.text_value, valueJson?.value, valueJson?.text, valueJson?.label, valueJson?.answer);
}

function normalizeIdentityText(value: string | undefined): string {
  return value?.replace(/[\s_-]/g, "").toLowerCase() ?? "";
}

function getResponseDimensionValue(response: RawAnalysisResponseRow, dimension: string): string | undefined {
  const profile = getRelationRecord(response.profile_json);
  const nestedProfile = getRelationRecord(profile?.profile);
  const rawPayload = getRelationRecord(response.raw_payload);
  const nestedRawPayloadProfile = getRelationRecord(rawPayload?.profile);
  if (dimension === "gender") return firstString(response.gender, profile?.gender, nestedProfile?.gender, rawPayload?.gender, nestedRawPayloadProfile?.gender);
  if (dimension === "semester_group") {
    return firstString(
      response.semester_group,
      profile?.semester_group,
      profile?.semesterGroup,
      nestedProfile?.semester_group,
      nestedProfile?.semesterGroup,
      rawPayload?.semester_group,
      rawPayload?.semesterGroup,
      nestedRawPayloadProfile?.semester_group,
      nestedRawPayloadProfile?.semesterGroup,
    );
  }
  if (dimension === "department") return firstString(response.department, profile?.department, nestedProfile?.department, rawPayload?.department, nestedRawPayloadProfile?.department);
  if (dimension === "rc") return firstString(response.rc, profile?.rc, nestedProfile?.rc, rawPayload?.rc, nestedRawPayloadProfile?.rc);
  if (dimension === "dormitory") return firstString(response.dormitory, profile?.dormitory, nestedProfile?.dormitory, rawPayload?.dormitory, nestedRawPayloadProfile?.dormitory);
  if (dimension === "room_type") {
    return firstString(
      response.room_type,
      profile?.room_type,
      profile?.roomType,
      nestedProfile?.room_type,
      nestedProfile?.roomType,
      rawPayload?.room_type,
      rawPayload?.roomType,
      nestedRawPayloadProfile?.room_type,
      nestedRawPayloadProfile?.roomType,
    );
  }
  if (dimension === "dorm_experience") {
    return firstString(
      response.dorm_experience,
      profile?.dorm_experience,
      profile?.dormExperience,
      nestedProfile?.dorm_experience,
      nestedProfile?.dormExperience,
      rawPayload?.dorm_experience,
      rawPayload?.dormExperience,
      nestedRawPayloadProfile?.dorm_experience,
      nestedRawPayloadProfile?.dormExperience,
    );
  }
  return undefined;
}

function firstString(...values: readonly unknown[]): string | undefined {
  for (const value of values) {
    const normalized = getString(value);
    if (normalized) return normalized;
  }
  return undefined;
}

function percentage(count: number, total: number): number {
  return total > 0 ? Math.round((count / total) * 1000) / 10 : 0;
}

function isProfileDistributionRow(value: unknown): value is ProfileDistributionRow {
  return isRecord(value) && typeof value.label === "string" && typeof value.n === "number";
}

function isMissingColumnError(error: unknown, columns: readonly string[]): boolean {
  const text = getErrorText(error).toLowerCase();
  const mentionsColumn = columns.some((column) => text.includes(column.toLowerCase()));
  return mentionsColumn && (text.includes("schema cache") || text.includes("does not exist") || text.includes("not found"));
}

function isMissingRelationshipError(error: unknown): boolean {
  const text = getErrorText(error).toLowerCase();
  return (
    text.includes("relationship") &&
    text.includes("answers") &&
    text.includes("responses") &&
    (text.includes("schema cache") || text.includes("does not exist") || text.includes("not found"))
  );
}

function isMissingRpcError(error: unknown, rpcName: string): boolean {
  const text = getErrorText(error).toLowerCase();
  return (
    text.includes(rpcName.toLowerCase()) &&
    (text.includes("function") || text.includes("rpc")) &&
    (text.includes("schema cache") || text.includes("does not exist") || text.includes("not found"))
  );
}

function getErrorText(error: unknown): string {
  if (error instanceof AdminApiError) {
    return [error.message, getErrorText(error.cause)].filter(Boolean).join(" ");
  }
  if (isRecord(error)) {
    return ["message", "code", "details", "hint"]
      .map((key) => error[key])
      .filter((value): value is string => typeof value === "string")
      .join(" ");
  }
  return typeof error === "string" ? error : "";
}

function getRelationRecord(value: unknown): Record<string, unknown> | undefined {
  if (Array.isArray(value)) return isRecord(value[0]) ? value[0] : undefined;
  return isRecord(value) ? value : undefined;
}

function getStoredImage(
  value: unknown,
  fallbackBucket: string,
): { storageBucket?: string; storagePath?: string; signedUrl?: string } | undefined {
  const image = findImageRecord(value);
  if (!image) return undefined;

  const metadata = getRelationRecord(image.metadata);
  const storagePath =
    getString(image.storagePath) ??
    getString(image.storage_path) ??
    getString(image.imageStoragePath) ??
    getString(image.image_storage_path) ??
    getString(image.filePath) ??
    getString(image.file_path) ??
    getString(image.path);
  const signedUrl =
    getString(image.signedUrl) ??
    getString(image.signed_url) ??
    getString(image.imageUrl) ??
    getString(image.image_url) ??
    getString(image.publicUrl) ??
    getString(image.public_url) ??
    getString(image.url) ??
    getString(metadata?.signedUrl) ??
    getString(metadata?.publicUrl) ??
    getString(metadata?.public_url);

  if (!storagePath && !signedUrl) return undefined;

  return {
    storageBucket:
      getString(image.storageBucket) ??
      getString(image.storage_bucket) ??
      getString(image.imageStorageBucket) ??
      getString(image.image_storage_bucket) ??
      getString(image.bucketId) ??
      getString(image.bucket_id) ??
      getString(image.bucket) ??
      (storagePath ? fallbackBucket : undefined),
    storagePath,
    signedUrl,
  };
}

function findImageRecord(value: unknown, seen = new Set<unknown>()): Record<string, unknown> | undefined {
  if (!value || seen.has(value)) return undefined;
  seen.add(value);

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findImageRecord(item, seen);
      if (found) return found;
    }
    return undefined;
  }

  if (!isRecord(value)) return undefined;
  if (hasImageFields(value)) return value;

  const preferredKeys = ["image", "uploadedImage", "uploaded_image", "photo", "file", "asset"];
  for (const key of preferredKeys) {
    const found = findImageRecord(value[key], seen);
    if (found) return found;
  }

  for (const item of Object.values(value)) {
    const found = findImageRecord(item, seen);
    if (found) return found;
  }

  return undefined;
}

function hasImageFields(value: Record<string, unknown>): boolean {
  return [
    value.storagePath,
    value.storage_path,
    value.imageStoragePath,
    value.image_storage_path,
    value.filePath,
    value.file_path,
    value.signedUrl,
    value.signed_url,
    value.imageUrl,
    value.image_url,
    value.publicUrl,
    value.public_url,
    value.url,
    value.path,
  ].some((item) => typeof item === "string" && item.trim().length > 0);
}

function compactRecord(value: Record<string, string | number | boolean | null | undefined>): Record<string, string | number | boolean> | undefined {
  const entries = Object.entries(value).filter(([, item]) => item !== null && item !== undefined && item !== "");
  return entries.length ? Object.fromEntries(entries) as Record<string, string | number | boolean> : undefined;
}

function getString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function getNumber(value: unknown): number | null {
  const numberValue = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(numberValue) ? numberValue : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isJsonRecord(value: unknown): value is JsonRecord {
  return isRecord(value);
}
