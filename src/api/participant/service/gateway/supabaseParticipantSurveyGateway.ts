import type { RawQuestion, RawSection, RawSurvey, RawSurveyAsset } from "../../../admin/service/gateway/rawTypes";
import type { ParticipantSurveyGateway, RawParticipantQuestionImageUpload } from "./participantSurveyGateway";
import type { SubmitSurveyResponseCommand, SubmitSurveyResponseResult } from "../../model";
import { ParticipantSurveyApiError, normalizeParticipantSurveyApiError } from "./participantSurveyApiError";

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
  };
  storage: {
    from(bucket: string): {
      upload(path: string, file: File, options?: Record<string, unknown>): Promise<{ data: unknown; error: unknown }>;
      createSignedUrl(path: string, expiresIn: number): Promise<{ data: { signedUrl?: string } | null; error: unknown }>;
    };
  };
  from(table: string): any;
  rpc(fn: string, args?: Record<string, unknown>): SupabaseResult<unknown>;
};

export class SupabaseParticipantSurveyGateway implements ParticipantSurveyGateway {
  constructor(
    private readonly supabase: SupabaseClientLike,
    private readonly bucket = "survey-assets",
  ) {}

  async getCurrentAuthUser() {
    const { data, error } = await this.supabase.auth.getSession();
    if (error) throw normalizeParticipantSurveyApiError(error, "UNAUTHENTICATED");
    return data.session?.user ? { id: data.session.user.id, email: data.session.user.email } : null;
  }

  async signInWithGoogle(args: { redirectTo: string }): Promise<void> {
    const { error } = await this.supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: args.redirectTo,
      },
    });
    if (error) throw normalizeParticipantSurveyApiError(error, "UNAUTHENTICATED");
  }

  async getPublishedSurveyByIdentifier(publicIdentifier: string): Promise<RawSurvey> {
    const identifier = publicIdentifier.trim();
    if (!identifier) {
      throw new ParticipantSurveyApiError("SURVEY_NOT_FOUND", "Survey public identifier is required.");
    }

    const bySlug = await this.maybeOne<RawSurvey>(
      this.baseSurveyQuery().eq("public_slug", identifier).maybeSingle(),
    );
    if (bySlug) return bySlug;

    const byCode = await this.maybeOne<RawSurvey>(
      this.baseSurveyQuery().eq("public_code", identifier.toUpperCase()).maybeSingle(),
    );
    if (byCode) return byCode;

    throw new ParticipantSurveyApiError("SURVEY_NOT_FOUND", "Published survey was not found.");
  }

  listSections(surveyId: string): Promise<RawSection[]> {
    return this.many<RawSection>(
      this.supabase.from("survey_sections").select("*").eq("survey_id", surveyId).order("order_index", { ascending: true }),
    );
  }

  listQuestions(surveyId: string): Promise<RawQuestion[]> {
    return this.many<RawQuestion>(
      this.supabase.from("questions").select("*").eq("survey_id", surveyId).order("order_index", { ascending: true }),
    );
  }

  async listAssets(surveyId: string): Promise<RawSurveyAsset[]> {
    const rows = await this.many<RawSurveyAsset>(
      this.supabase.from("survey_assets").select("*").eq("survey_id", surveyId).order("created_at", { ascending: false }),
    );
    return Promise.all(rows.map((row) => this.withSignedAssetUrl(row)));
  }

  async uploadQuestionImage(command: { surveyId: string; questionId: string; file: File }): Promise<RawParticipantQuestionImageUpload> {
    if (!command.file.type.startsWith("image/")) {
      throw new ParticipantSurveyApiError("UPLOAD_FAILED", "Only image files can be uploaded.");
    }

    const { data: userData, error: userError } = await this.supabase.auth.getUser();
    if (userError) throw normalizeParticipantSurveyApiError(userError);
    const user = userData.user;
    if (!user) throw new ParticipantSurveyApiError("UNAUTHENTICATED", "Login is required to upload an image.");

    const extension = getFileExtension(command.file.name);
    const uploadId = crypto.randomUUID();
    const storagePath = `participant-uploads/${command.surveyId}/${user.id}/${command.questionId}/${uploadId}${extension}`;
    const { error } = await this.supabase.storage.from(this.bucket).upload(storagePath, command.file, {
      cacheControl: "3600",
      contentType: command.file.type || undefined,
      upsert: false,
    });
    if (error) throw normalizeParticipantSurveyApiError(error);

    const { data } = await this.supabase.storage.from(this.bucket).createSignedUrl(storagePath, 60 * 60);
    return {
      storage_bucket: this.bucket,
      storage_path: storagePath,
      signed_url: data?.signedUrl,
      metadata: {
        originalName: command.file.name,
        contentType: command.file.type,
        size: command.file.size,
      },
    };
  }

  async submitSurveyResponse(command: SubmitSurveyResponseCommand): Promise<SubmitSurveyResponseResult> {
    const { data, error } = await this.supabase.rpc("submit_survey_response", {
      payload: {
        clientSubmissionId: command.clientSubmissionId,
        response: {
          survey_id: command.surveyId,
          locale: command.locale ?? "ko",
          started_at: command.startedAt ?? null,
          gender: getProfileString(command.profile, "gender"),
          semester_group: getProfileString(command.profile, "semester_group"),
          department: getProfileString(command.profile, "department"),
          rc: getProfileString(command.profile, "rc"),
          dormitory: getProfileString(command.profile, "dormitory"),
          room_type: getProfileString(command.profile, "room_type"),
          dorm_experience: getProfileString(command.profile, "dorm_experience"),
          profile_json: command.profile,
          raw_payload: command.rawPayload,
        },
        answers: command.answers.map((answer) => ({
          question_id: answer.questionId,
          section_id: answer.sectionId ?? null,
          asset_id: answer.assetId ?? null,
          answer_type: answer.answerType,
          metric_type: answer.metricType ?? "none",
          topic_key: answer.topicKey ?? null,
          space_key: answer.spaceKey ?? null,
          score_value: answer.scoreValue ?? null,
          text_value: answer.textValue ?? null,
          choice_value: answer.choiceValue ?? null,
          x_ratio: answer.xRatio ?? null,
          y_ratio: answer.yRatio ?? null,
          tag_type: answer.tagType ?? null,
          severity: answer.severity ?? null,
          value_json: answer.valueJson ?? {},
        })),
        rawPayload: command.rawPayload,
      },
    });
    if (error) throw normalizeParticipantSurveyApiError(error, "SUBMIT_FAILED");
    const result = isRecord(data) ? data : {};
    return {
      responseId: getString(result.responseId) ?? "",
      submittedAt: getString(result.submittedAt) ?? new Date().toISOString(),
      alreadySubmitted: Boolean(result.alreadySubmitted),
      passedAttentionCheck: result.passedAttentionCheck !== false,
    };
  }

  private baseSurveyQuery() {
    return this.supabase.from("surveys").select("*").eq("status", "published").eq("is_latest_version", true);
  }

  private async maybeOne<T>(query: SupabaseResult<unknown>): Promise<T | null> {
    const { data, error } = await query;
    if (error) throw normalizeParticipantSurveyApiError(error);
    return data as T | null;
  }

  private async many<T>(query: SupabaseResult<unknown>): Promise<T[]> {
    const { data, error } = await query;
    if (error) throw normalizeParticipantSurveyApiError(error);
    return (data ?? []) as T[];
  }

  private async withSignedAssetUrl(row: RawSurveyAsset): Promise<RawSurveyAsset> {
    try {
      const { data, error } = await this.supabase.storage.from(row.storage_bucket).createSignedUrl(row.storage_path, 60 * 60);
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

function getFileExtension(fileName: string): string {
  const dotIndex = fileName.lastIndexOf(".");
  if (dotIndex < 0) return "";
  return fileName.slice(dotIndex).toLowerCase();
}

function getProfileString(profile: Record<string, unknown>, key: string): string | null {
  const value = profile[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
