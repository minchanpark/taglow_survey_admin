import type { RawQuestion, RawSection, RawSurvey, RawSurveyAsset } from "../../../admin/service/gateway/rawTypes";
import type { ParticipantSurveyGateway } from "./participantSurveyGateway";
import { ParticipantSurveyApiError, normalizeParticipantSurveyApiError } from "./participantSurveyApiError";

type SupabaseResult<T> = PromiseLike<{ data: T | null; error: unknown }>;

type SupabaseClientLike = {
  from(table: string): any;
};

export class SupabaseParticipantSurveyGateway implements ParticipantSurveyGateway {
  constructor(private readonly supabase: SupabaseClientLike) {}

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

  listAssets(surveyId: string): Promise<RawSurveyAsset[]> {
    return this.many<RawSurveyAsset>(
      this.supabase.from("survey_assets").select("*").eq("survey_id", surveyId).order("created_at", { ascending: false }),
    );
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
}
