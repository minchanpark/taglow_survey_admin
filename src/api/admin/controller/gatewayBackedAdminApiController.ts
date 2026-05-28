import type { AdminApiGateway } from "../service/gateway/adminApiGateway";
import type { AdminStorageGateway } from "../service/gateway/adminStorageGateway";
import type { RawCreateQuestionPayload, RawCreateSectionPayload, RawUpdateQuestionPayload, RawUpdateSectionPayload } from "../service/gateway/rawTypes";
import { AdminPayloadMapper } from "../service/mapper/adminPayloadMapper";
import { assertCreateSectionCommand, assertUpdateSectionCommand } from "../service/validation/sectionSchema";
import { assertCreateSurveyCommand, assertUpdateSurveyCommand } from "../service/validation/surveySchema";
import { assertUploadSurveyImageCommand } from "../service/validation/assetSchema";
import { toAnalysisFilterPayload } from "../service/validation/filterSchema";
import { validatePublishSurveyDetail } from "../service/validation/publishValidation";
import { isHandongEmail } from "../../../utils/authDomain";
import type {
  AdminMember,
  AdminSessionState,
  AdminSignInCommand,
  AnalysisFilterCommand,
  BorichResult,
  CreateQuestionCommand,
  CreateSectionCommand,
  CreateSurveyCommand,
  FilterOptions,
  HeatmapFilterCommand,
  HeatmapPoint,
  PreviewSurvey,
  PreviewSurveyCommand,
  PublishValidationResult,
  Question,
  ReorderQuestionsCommand,
  ReorderSectionsCommand,
  SectionSummary,
  Survey,
  SurveyAsset,
  SurveyDetail,
  SurveySection,
  TextAnswer,
  TextAnswerFilterCommand,
  UpdateQuestionCommand,
  UpdateSectionCommand,
  UpdateSurveyCommand,
  UploadSurveyImageCommand,
} from "../model";
import type { AdminApiController } from "./adminApiController";

export class GatewayBackedAdminApiController implements AdminApiController {
  constructor(
    private readonly gateway: AdminApiGateway,
    private readonly storageGateway: AdminStorageGateway,
    private readonly mapper: AdminPayloadMapper = new AdminPayloadMapper(),
  ) {}

  async getAdminSessionState(): Promise<AdminSessionState> {
    const user = await this.gateway.getCurrentAuthUser();
    if (!user) {
      return {
        isAuthenticated: false,
        isHandongEmail: false,
      };
    }

    const email = user.email?.toLowerCase();
    const hasHandongDomain = isHandongEmail(email);
    if (!hasHandongDomain) {
      return {
        isAuthenticated: true,
        email,
        isHandongEmail: false,
      };
    }

    return {
      isAuthenticated: true,
      email,
      isHandongEmail: true,
      admin: (await this.getCurrentAdmin()) ?? undefined,
    };
  }

  async getCurrentAdmin(): Promise<AdminMember | null> {
    const row = await this.gateway.getCurrentAdmin();
    return row ? this.mapper.toAdminMember(row) : null;
  }

  signInWithGoogle(command: AdminSignInCommand): Promise<void> {
    return this.gateway.signInWithGoogle(command);
  }

  signOut(): Promise<void> {
    return this.gateway.signOut();
  }

  async listSurveys(): Promise<Survey[]> {
    const rows = await this.gateway.listSurveys();
    return rows.map((row) => this.mapper.toSurvey(row));
  }

  async getSurveyDetail(surveyId: string): Promise<SurveyDetail> {
    const [survey, sections, questions, assets] = await Promise.all([
      this.gateway.getSurvey(surveyId),
      this.gateway.listSections(surveyId),
      this.gateway.listQuestions(surveyId),
      this.gateway.listAssets(surveyId),
    ]);

    return {
      survey: this.mapper.toSurvey(survey),
      sections: sections.map((row) => this.mapper.toSection(row)),
      questions: questions.map((row) => this.mapper.toQuestion(row)),
      assets: assets.map((row) => this.mapper.toAsset(row)),
    };
  }

  async createSurvey(command: CreateSurveyCommand): Promise<Survey> {
    assertCreateSurveyCommand(command);
    const row = await this.gateway.createSurvey({
      title: command.title,
      description: command.description ?? null,
      settings: command.settings ?? {},
    });
    return this.mapper.toSurvey(row);
  }

  async updateSurvey(command: UpdateSurveyCommand): Promise<Survey> {
    assertUpdateSurveyCommand(command);
    const row = await this.gateway.updateSurvey({
      surveyId: command.surveyId,
      payload: {
        title: command.title,
        description: command.description,
        status: command.status,
        public_slug: command.publicSlug,
        settings: command.settings,
      },
    });
    return this.mapper.toSurvey(row);
  }

  deleteDraftSurvey(surveyId: string): Promise<void> {
    return this.gateway.deleteDraftSurvey(surveyId);
  }

  async createSection(command: CreateSectionCommand): Promise<SurveySection> {
    assertCreateSectionCommand(command);
    const row = await this.gateway.createSection(toCreateSectionPayload(command));
    return this.mapper.toSection(row);
  }

  async updateSection(command: UpdateSectionCommand): Promise<SurveySection> {
    assertUpdateSectionCommand(command);
    const row = await this.gateway.updateSection({
      sectionId: command.sectionId,
      payload: toUpdateSectionPayload(command),
    });
    return this.mapper.toSection(row);
  }

  async reorderSections(command: ReorderSectionsCommand): Promise<SurveySection[]> {
    const updated = await Promise.all(
      command.sectionIds.map((sectionId, index) =>
        this.gateway.updateSection({
          sectionId,
          payload: { order_index: index },
        }),
      ),
    );
    return updated.map((row) => this.mapper.toSection(row));
  }

  deleteSection(sectionId: string): Promise<void> {
    return this.gateway.deleteSection(sectionId);
  }

  async createQuestion(command: CreateQuestionCommand): Promise<Question> {
    const row = await this.gateway.createQuestion(toCreateQuestionPayload(command));
    return this.mapper.toQuestion(row);
  }

  async updateQuestion(command: UpdateQuestionCommand): Promise<Question> {
    const row = await this.gateway.updateQuestion({
      questionId: command.questionId,
      payload: toUpdateQuestionPayload(command),
    });
    return this.mapper.toQuestion(row);
  }

  async reorderQuestions(command: ReorderQuestionsCommand): Promise<Question[]> {
    const updated = await Promise.all(
      command.questionIds.map((questionId, index) =>
        this.gateway.updateQuestion({
          questionId,
          payload: { order_index: index },
        }),
      ),
    );
    return updated.map((row) => this.mapper.toQuestion(row));
  }

  deleteQuestion(questionId: string): Promise<void> {
    return this.gateway.deleteQuestion(questionId);
  }

  async uploadSurveyImage(command: UploadSurveyImageCommand): Promise<SurveyAsset> {
    assertUploadSurveyImageCommand(command);
    const uploaded = await this.storageGateway.uploadSurveyAsset(command);
    const row = await this.gateway.createAssetMetadata({
      survey_id: command.surveyId,
      section_id: command.sectionId ?? null,
      question_id: command.questionId ?? null,
      asset_type: "image",
      storage_bucket: uploaded.storageBucket,
      storage_path: uploaded.storagePath,
      metadata: uploaded.metadata,
    });
    return this.mapper.toAsset(row);
  }

  async validateBeforePublish(surveyId: string): Promise<PublishValidationResult> {
    return validatePublishSurveyDetail(await this.getSurveyDetail(surveyId));
  }

  async publishSurvey(surveyId: string): Promise<Survey> {
    const validation = await this.validateBeforePublish(surveyId);
    if (!validation.canPublish) {
      throw new Error("Survey cannot be published until validation errors are resolved.");
    }
    return this.mapper.toSurvey(await this.gateway.publishSurvey(surveyId));
  }

  async closeSurvey(surveyId: string): Promise<Survey> {
    return this.mapper.toSurvey(await this.gateway.closeSurvey(surveyId));
  }

  async createNextVersion(surveyId: string): Promise<Survey> {
    return this.mapper.toSurvey(await this.gateway.createNextSurveyVersion(surveyId));
  }

  async getPreviewSurvey(command: PreviewSurveyCommand): Promise<PreviewSurvey> {
    const detail = await this.getSurveyDetail(command.surveyId);
    return {
      ...detail,
      previewMode: true,
      options: command.options,
    };
  }

  async getFilterOptions(surveyId: string): Promise<FilterOptions> {
    return this.mapper.toFilterOptions(await this.gateway.getFilterOptions(surveyId));
  }

  async getSectionSatisfactionSummary(command: AnalysisFilterCommand): Promise<SectionSummary[]> {
    const rows = await this.gateway.getSectionSatisfactionSummary({
      surveyId: command.surveyId,
      filters: toAnalysisFilterPayload(command.filters),
    });
    return rows.map((row) => this.mapper.toSectionSummary(row));
  }

  async getBorichSummary(command: AnalysisFilterCommand): Promise<BorichResult[]> {
    const rows = await this.gateway.getBorichSummary({
      surveyId: command.surveyId,
      filters: toAnalysisFilterPayload(command.filters),
    });
    return rows.map((row) => this.mapper.toBorichResult(row));
  }

  async getHeatmapPoints(command: HeatmapFilterCommand): Promise<HeatmapPoint[]> {
    const rows = await this.gateway.getHeatmapPoints({
      surveyId: command.surveyId,
      filters: toAnalysisFilterPayload(command.filters),
    });
    return rows.map((row) => this.mapper.toHeatmapPoint(row));
  }

  async listTextAnswers(command: TextAnswerFilterCommand): Promise<TextAnswer[]> {
    const rows = await this.gateway.listTextAnswers({
      surveyId: command.surveyId,
      filters: toAnalysisFilterPayload(command.filters),
    });
    return rows.map((row) => this.mapper.toTextAnswer(row));
  }
}

function toCreateSectionPayload(command: CreateSectionCommand): RawCreateSectionPayload {
  return {
    survey_id: command.surveyId,
    section_key: command.sectionKey,
    title_ko: command.title.ko,
    title_en: command.title.en ?? null,
    description_ko: command.description?.ko ?? null,
    description_en: command.description?.en ?? null,
    order_index: command.orderIndex,
    section_type: command.sectionType ?? "general",
    settings: command.settings ?? {},
  };
}

function toUpdateSectionPayload(command: UpdateSectionCommand): RawUpdateSectionPayload {
  return {
    title_ko: command.title?.ko,
    title_en: command.title?.en,
    description_ko: command.description?.ko,
    description_en: command.description?.en,
    order_index: command.orderIndex,
    section_type: command.sectionType,
    settings: command.settings,
  };
}

function toCreateQuestionPayload(command: CreateQuestionCommand): RawCreateQuestionPayload {
  return {
    survey_id: command.surveyId,
    section_id: command.sectionId,
    question_key: command.questionKey,
    question_type: command.questionType,
    title_ko: command.title.ko,
    title_en: command.title.en ?? null,
    description_ko: command.description?.ko ?? null,
    description_en: command.description?.en ?? null,
    order_index: command.orderIndex,
    is_required: command.isRequired ?? false,
    metric_type: command.metricType ?? "none",
    topic_key: command.topicKey ?? null,
    space_key: command.spaceKey ?? null,
    config: command.config ?? {},
    validation: command.validation ?? {},
  };
}

function toUpdateQuestionPayload(command: UpdateQuestionCommand): RawUpdateQuestionPayload {
  return {
    title_ko: command.title?.ko,
    title_en: command.title?.en,
    description_ko: command.description?.ko,
    description_en: command.description?.en,
    order_index: command.orderIndex,
    is_required: command.isRequired,
    metric_type: command.metricType,
    topic_key: command.topicKey,
    space_key: command.spaceKey,
    config: command.config,
    validation: command.validation,
  };
}
