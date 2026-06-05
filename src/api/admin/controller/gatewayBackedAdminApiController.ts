import type { AdminApiGateway } from "../service/gateway/adminApiGateway";
import type { AdminStorageGateway } from "../service/gateway/adminStorageGateway";
import type {
  RawCreateQuestionPayload,
  RawCreateSectionPayload,
  RawQuestion,
  RawSection,
  RawUpdateQuestionPayload,
  RawUpdateSectionPayload,
} from "../service/gateway/rawTypes";
import { AdminPayloadMapper } from "../service/mapper/adminPayloadMapper";
import { getQuestionSetTemplate } from "../service/questionSet";
import { assertCreateSectionCommand, assertUpdateSectionCommand } from "../service/validation/sectionSchema";
import { assertCreateSurveyCommand, assertUpdateSurveyCommand } from "../service/validation/surveySchema";
import { assertUploadSurveyImageCommand } from "../service/validation/assetSchema";
import { toAnalysisFilterPayload } from "../service/validation/filterSchema";
import { validatePublishSurveyDetail } from "../service/validation/publishValidation";
import { normalizeReportNarrativeResult, sanitizeReportNarrativeCommand } from "../service/validation/reportNarrative";
import { buildFilterOptionsFromQuestions, isAdminAccessRole } from "../model";
import type {
  AdminMember,
  AdminSessionState,
  AdminSignInCommand,
  AnalysisFilterCommand,
  ApproveAdminMemberCommand,
  BorichResult,
  ChoiceDistribution,
  CreateQuestionCommand,
  CreateSectionCommand,
  CreateSurveyCommand,
  DeleteAdminMemberCommand,
  FilterOptions,
  GroupCompareFilterCommand,
  GroupCompareResult,
  HeatmapFilterCommand,
  HeatmapPoint,
  ImageTagAnswer,
  ImageTagAnswerFilterCommand,
  IdentityResponse,
  IdentityResponseFilterCommand,
  InviteSurveyCollaboratorCommand,
  JsonRecord,
  LocusPoint,
  PaginatedResult,
  PreviewSurvey,
  PreviewSurveyCommand,
  PriorityIssue,
  QuestionSetImportCommand,
  QuestionSetImportPreview,
  QuestionSetImportPreviewCommand,
  QuestionSetImportResult,
  QuestionSetQuestionPreview,
  QuestionSetTemplate,
  QuestionSetTemplateQuestion,
  QuestionSetTemplateSection,
  PublishValidationResult,
  Question,
  QuestionSummary,
  ReorderQuestionsCommand,
  ReorderSectionsCommand,
  ReportNarrativeCommand,
  ReportNarrativeResult,
  RevokeSurveyCollaboratorCommand,
  ResponseSummary,
  SectionSummary,
  Survey,
  SurveyAsset,
  SurveyCollaborator,
  SurveyDetail,
  SurveySection,
  TextAnswer,
  TextAnswerFilterCommand,
  TextGroup,
  UpdateAdminMemberRoleCommand,
  UpdateQuestionCommand,
  UpdateSectionCommand,
  UpdateSurveyCollaboratorRoleCommand,
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
      };
    }

    const email = user.email?.toLowerCase();
    let memberRow: Awaited<ReturnType<AdminApiGateway["getOwnAdminMember"]>>;
    try {
      memberRow = await this.gateway.getOwnAdminMember();
    } catch {
      const activeAdmin = await this.getCurrentAdmin();
      const hasSurveyAccess = activeAdmin ? true : await this.gateway.hasAccessibleSurveys();
      return {
        isAuthenticated: true,
        email,
        admin: activeAdmin ?? undefined,
        hasSurveyAccess,
      };
    }
    const member = memberRow ? this.mapper.toAdminMember(memberRow) : undefined;
    const hasAdminAccess = member ? member.isActive && isAdminAccessRole(member.role) : false;
    const hasSurveyAccess = hasAdminAccess ? true : await this.gateway.hasAccessibleSurveys();
    return {
      isAuthenticated: true,
      email,
      admin: hasAdminAccess ? member : undefined,
      pendingAdmin: member?.role === "admin" && !member.isActive ? member : undefined,
      hasSurveyAccess,
    };
  }

  async getCurrentAdmin(): Promise<AdminMember | null> {
    const row = await this.gateway.getCurrentAdmin();
    return row ? this.mapper.toAdminMember(row) : null;
  }

  async requestAdminAccess(): Promise<AdminMember> {
    const row = await this.gateway.requestAdminAccess();
    return this.mapper.toAdminMember(row);
  }

  async listPendingAdminMembers(): Promise<AdminMember[]> {
    const rows = await this.gateway.listPendingAdminMembers();
    return rows.map((row) => this.mapper.toAdminMember(row));
  }

  async listActiveAdminMembers(): Promise<AdminMember[]> {
    const rows = await this.gateway.listActiveAdminMembers();
    return rows.map((row) => this.mapper.toAdminMember(row));
  }

  async approveAdminMember(command: ApproveAdminMemberCommand): Promise<AdminMember> {
    const row = await this.gateway.approveAdminMember({
      memberId: command.memberId,
      role: command.role,
    });
    return this.mapper.toAdminMember(row);
  }

  async updateAdminMemberRole(command: UpdateAdminMemberRoleCommand): Promise<AdminMember> {
    const row = await this.gateway.updateAdminMemberRole({
      memberId: command.memberId,
      role: command.role,
    });
    return this.mapper.toAdminMember(row);
  }

  deleteAdminMember(command: DeleteAdminMemberCommand): Promise<void> {
    return this.gateway.deleteAdminMember({ memberId: command.memberId });
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
      title: command.title.ko,
      title_en: nullableText(command.title.en),
      description: command.description?.ko ?? null,
      description_en: command.description?.en ?? null,
      settings: command.settings ?? {},
    });
    return this.mapper.toSurvey(row);
  }

  async updateSurvey(command: UpdateSurveyCommand): Promise<Survey> {
    assertUpdateSurveyCommand(command);
    const row = await this.gateway.updateSurvey({
      surveyId: command.surveyId,
      payload: compactPayload({
        title: hasOwn(command, "title") ? command.title?.ko : undefined,
        title_en: hasOwn(command, "title") ? nullableText(command.title?.en) : undefined,
        description: hasOwn(command, "description") ? nullableText(command.description?.ko) : undefined,
        description_en: hasOwn(command, "description") ? nullableText(command.description?.en) : undefined,
        status: command.status,
        public_slug: hasOwn(command, "publicSlug") ? nullableText(command.publicSlug) : undefined,
        public_code: hasOwn(command, "publicCode") ? normalizePublicCode(command.publicCode) : undefined,
        starts_at: hasOwn(command, "startsAt") ? nullableTimestamp(command.startsAt) : undefined,
        ends_at: hasOwn(command, "endsAt") ? nullableTimestamp(command.endsAt) : undefined,
        settings: command.settings,
      }),
    });
    return this.mapper.toSurvey(row);
  }

  async archiveSurvey(surveyId: string): Promise<Survey> {
    return this.mapper.toSurvey(await this.gateway.archiveSurvey(surveyId));
  }

  deleteSurvey(surveyId: string): Promise<void> {
    return this.gateway.deleteSurvey(surveyId);
  }

  deleteDraftSurvey(surveyId: string): Promise<void> {
    return this.deleteSurvey(surveyId);
  }

  async listSurveyCollaborators(surveyId: string): Promise<SurveyCollaborator[]> {
    const rows = await this.gateway.listSurveyCollaborators(surveyId);
    return rows.map((row) => this.mapper.toSurveyCollaborator(row));
  }

  async inviteSurveyCollaborator(command: InviteSurveyCollaboratorCommand): Promise<SurveyCollaborator> {
    const user = await this.gateway.getCurrentAuthUser();
    if (!user) {
      throw new Error("Login is required to share a survey.");
    }
    const row = await this.gateway.createSurveyCollaborator({
      survey_id: command.surveyId,
      email: normalizeEmail(command.email),
      role: command.role,
      invited_by: user.id,
    });
    return this.mapper.toSurveyCollaborator(row);
  }

  async updateSurveyCollaboratorRole(command: UpdateSurveyCollaboratorRoleCommand): Promise<SurveyCollaborator> {
    const row = await this.gateway.updateSurveyCollaborator({
      collaboratorId: command.collaboratorId,
      payload: { role: command.role },
    });
    return this.mapper.toSurveyCollaborator(row);
  }

  async revokeSurveyCollaborator(command: RevokeSurveyCollaboratorCommand): Promise<SurveyCollaborator> {
    const row = await this.gateway.updateSurveyCollaborator({
      collaboratorId: command.collaboratorId,
      payload: { revoked_at: new Date().toISOString() },
    });
    return this.mapper.toSurveyCollaborator(row);
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

  async previewQuestionSetImport(command: QuestionSetImportPreviewCommand): Promise<QuestionSetImportPreview> {
    const [template, sections, questions] = await Promise.all([
      Promise.resolve(getQuestionSetTemplate(command.templateId)),
      this.gateway.listSections(command.surveyId),
      this.gateway.listQuestions(command.surveyId),
    ]);
    return buildQuestionSetImportPreview(template, sections, questions);
  }

  async importQuestionSet(command: QuestionSetImportCommand): Promise<QuestionSetImportResult> {
    if (command.conflictMode !== "append_skip_existing_keys") {
      throw new Error(`Unsupported question set conflict mode: ${command.conflictMode}`);
    }

    const [template, existingSections, existingQuestions] = await Promise.all([
      Promise.resolve(getQuestionSetTemplate(command.templateId)),
      this.gateway.listSections(command.surveyId),
      this.gateway.listQuestions(command.surveyId),
    ]);
    const existingSectionByKey = new Map(existingSections.map((section) => [section.section_key, section]));
    const existingQuestionKeys = new Set(existingQuestions.map((question) => question.question_key));
    const nextSectionOrderIndex = Math.max(-1, ...existingSections.map((section) => section.order_index)) + 1;

    const missingSections = template.sections.filter((section) => !existingSectionByKey.has(section.sectionKey));
    const sectionPayloads = missingSections.map((section, index) =>
      toCreateSectionPayloadFromTemplate(command.surveyId, section, nextSectionOrderIndex + index),
    );
    const createdSections = await this.gateway.createSections(sectionPayloads);
    const sectionByKey = new Map<string, RawSection>([...existingSectionByKey, ...createdSections.map((section) => [section.section_key, section] as const)]);
    const nextQuestionOrderIndexBySection = createNextQuestionOrderMap(existingQuestions);
    let skippedQuestions = 0;

    const questionPayloads: RawCreateQuestionPayload[] = [];
    for (const section of template.sections) {
      const rawSection = sectionByKey.get(section.sectionKey);
      if (!rawSection) continue;

      const nextOrder = nextQuestionOrderIndexBySection.get(rawSection.id) ?? 0;
      let offset = 0;
      for (const question of section.questions) {
        if (existingQuestionKeys.has(question.questionKey)) {
          skippedQuestions += 1;
          continue;
        }
        questionPayloads.push(
          toCreateQuestionPayloadFromTemplate(command.surveyId, rawSection.id, question, nextOrder + offset, template.templateId),
        );
        existingQuestionKeys.add(question.questionKey);
        offset += 1;
      }
    }

    const createdQuestions = await this.gateway.createQuestions(questionPayloads);
    return {
      templateId: command.templateId,
      sectionsCreated: createdSections.length,
      questionsCreated: createdQuestions.length,
      questionsSkipped: skippedQuestions,
      sectionKeys: createdSections.map((section) => section.section_key),
      questionKeys: createdQuestions.map((question) => question.question_key),
    };
  }

  async getFilterOptions(surveyId: string): Promise<FilterOptions> {
    const questions = await this.gateway.listQuestions(surveyId);
    return buildFilterOptionsFromQuestions(questions.map((row) => this.mapper.toQuestion(row)));
  }

  async getResponseSummary(command: AnalysisFilterCommand): Promise<ResponseSummary> {
    const row = await this.gateway.getResponseSummary({
      surveyId: command.surveyId,
      filters: toAnalysisFilterPayload(command.filters),
    });
    return this.mapper.toResponseSummary(row);
  }

  async getSectionSatisfactionSummary(command: AnalysisFilterCommand): Promise<SectionSummary[]> {
    const rows = await this.gateway.getSectionSatisfactionSummary({
      surveyId: command.surveyId,
      filters: toAnalysisFilterPayload(command.filters),
    });
    return rows.map((row) => this.mapper.toSectionSummary(row));
  }

  async getQuestionSatisfactionSummary(command: AnalysisFilterCommand): Promise<QuestionSummary[]> {
    const rows = await this.gateway.getQuestionSatisfactionSummary({
      surveyId: command.surveyId,
      filters: toAnalysisFilterPayload(command.filters),
    });
    return rows.map((row) => this.mapper.toQuestionSummary(row));
  }

  async getChoiceDistribution(command: AnalysisFilterCommand): Promise<ChoiceDistribution[]> {
    const rows = await this.gateway.getChoiceDistribution({
      surveyId: command.surveyId,
      filters: toAnalysisFilterPayload(command.filters),
    });
    return rows.map((row) => this.mapper.toChoiceDistribution(row));
  }

  async getGroupCompareSummary(command: GroupCompareFilterCommand): Promise<GroupCompareResult[]> {
    const rows = await this.gateway.getGroupCompareSummary({
      surveyId: command.surveyId,
      filters: toAnalysisFilterPayload(command.filters),
    });
    return rows.map((row) => this.mapper.toGroupCompareResult(row));
  }

  async getPriorityTop5(command: AnalysisFilterCommand): Promise<PriorityIssue[]> {
    const rows = await this.gateway.getPriorityTop5({
      surveyId: command.surveyId,
      filters: toAnalysisFilterPayload(command.filters),
    });
    return rows.map((row) => this.mapper.toPriorityIssue(row));
  }

  async getBorichSummary(command: AnalysisFilterCommand): Promise<BorichResult[]> {
    const rows = await this.gateway.getBorichSummary({
      surveyId: command.surveyId,
      filters: toAnalysisFilterPayload(command.filters),
    });
    return rows.map((row) => this.mapper.toBorichResult(row));
  }

  async getLocusSummary(command: AnalysisFilterCommand): Promise<LocusPoint[]> {
    const rows = await this.gateway.getLocusSummary({
      surveyId: command.surveyId,
      filters: toAnalysisFilterPayload(command.filters),
    });
    return rows.map((row) => this.mapper.toLocusPoint(row));
  }

  async getHeatmapPoints(command: HeatmapFilterCommand): Promise<HeatmapPoint[]> {
    const rows = await this.gateway.getHeatmapPoints({
      surveyId: command.surveyId,
      filters: toAnalysisFilterPayload(command.filters),
    });
    return rows.map((row) => this.mapper.toHeatmapPoint(row));
  }

  async listImageTagAnswers(command: ImageTagAnswerFilterCommand): Promise<PaginatedResult<ImageTagAnswer>> {
    const page = await this.gateway.listImageTagAnswers({
      surveyId: command.surveyId,
      filters: toAnalysisFilterPayload(command.filters),
    });
    return {
      items: page.items.map((row) => this.mapper.toImageTagAnswer(row)),
      nextCursor: page.next_cursor ?? undefined,
    };
  }

  async listIdentityResponses(command: IdentityResponseFilterCommand): Promise<PaginatedResult<IdentityResponse>> {
    const page = await this.gateway.listIdentityResponses({
      surveyId: command.surveyId,
      filters: toAnalysisFilterPayload(command.filters),
    });
    return {
      items: page.items.map((row) => this.mapper.toIdentityResponse(row)),
      nextCursor: page.next_cursor ?? undefined,
    };
  }

  async getTextGroups(command: TextAnswerFilterCommand): Promise<TextGroup[]> {
    const rows = await this.gateway.getTextGroups({
      surveyId: command.surveyId,
      filters: toAnalysisFilterPayload(command.filters),
    });
    return rows.map((row) => this.mapper.toTextGroup(row));
  }

  async listTextAnswers(command: TextAnswerFilterCommand): Promise<PaginatedResult<TextAnswer>> {
    const page = await this.gateway.listTextAnswers({
      surveyId: command.surveyId,
      filters: toAnalysisFilterPayload(command.filters),
    });
    return {
      items: page.items.map((row) => this.mapper.toTextAnswer(row)),
      nextCursor: page.next_cursor ?? undefined,
    };
  }

  async generateReportNarrative(command: ReportNarrativeCommand): Promise<ReportNarrativeResult> {
    const sanitized = sanitizeReportNarrativeCommand(command);
    const result = await this.gateway.generateReportNarrative(sanitized);
    return normalizeReportNarrativeResult(result, sanitized);
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
  return compactPayload({
    section_key: command.sectionKey,
    title_ko: command.title?.ko,
    title_en: command.title ? command.title.en ?? null : undefined,
    description_ko: hasOwn(command, "description") ? nullableText(command.description?.ko) : undefined,
    description_en: hasOwn(command, "description") ? nullableText(command.description?.en) : undefined,
    order_index: command.orderIndex,
    section_type: command.sectionType,
    settings: command.settings,
  });
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
  return compactPayload({
    question_key: command.questionKey,
    question_type: command.questionType,
    title_ko: command.title?.ko,
    title_en: command.title ? command.title.en ?? null : undefined,
    description_ko: hasOwn(command, "description") ? nullableText(command.description?.ko) : undefined,
    description_en: hasOwn(command, "description") ? nullableText(command.description?.en) : undefined,
    order_index: command.orderIndex,
    is_required: command.isRequired,
    metric_type: command.metricType,
    topic_key: hasOwn(command, "topicKey") ? nullableText(command.topicKey) : undefined,
    space_key: hasOwn(command, "spaceKey") ? nullableText(command.spaceKey) : undefined,
    config: command.config,
    validation: command.validation,
  });
}

function nullableText(value: string | null | undefined): string | null {
  return value?.trim() ? value : null;
}

function nullableTimestamp(value: string | null | undefined): string | null {
  return value?.trim() ? value : null;
}

function normalizePublicCode(value: string | null | undefined): string | undefined {
  const normalized = value?.trim().toUpperCase();
  return normalized || undefined;
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function hasOwn<TObject extends object>(object: TObject, key: keyof TObject): boolean {
  return Object.prototype.hasOwnProperty.call(object, key);
}

function compactPayload<TPayload extends Record<string, unknown>>(payload: TPayload): TPayload {
  return Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined)) as TPayload;
}

function buildQuestionSetImportPreview(
  template: QuestionSetTemplate,
  sections: RawSection[],
  questions: RawQuestion[],
): QuestionSetImportPreview {
  const existingSectionKeys = new Set(sections.map((section) => section.section_key));
  const existingQuestionKeys = new Set(questions.map((question) => question.question_key));
  const sectionPreviews = template.sections.map((section, orderIndex) => ({
    sectionKey: section.sectionKey,
    title: section.title,
    sectionType: section.sectionType,
    orderIndex,
    questionCount: section.questions.length,
    isExisting: existingSectionKeys.has(section.sectionKey),
  }));
  const questionPreviews = template.sections.flatMap((section) =>
    section.questions.map<QuestionSetQuestionPreview>((question) => ({
      sourceNumber: question.sourceNumber,
      sectionKey: section.sectionKey,
      questionKey: question.questionKey,
      title: question.title,
      questionType: question.questionType,
      metricType: question.metricType,
      topicKey: question.topicKey,
      spaceKey: question.spaceKey,
      config: question.config,
      isRequired: question.isRequired,
      displayGroup: question.displayGroup,
      displayGroupEn: question.displayGroupEn,
      isExisting: existingQuestionKeys.has(question.questionKey),
    })),
  );

  return {
    templateId: template.templateId,
    title: template.title,
    sections: sectionPreviews,
    questions: questionPreviews,
    totalSectionCount: sectionPreviews.length,
    totalQuestionCount: questionPreviews.length,
    importableSectionCount: sectionPreviews.filter((section) => !section.isExisting).length,
    importableQuestionCount: questionPreviews.filter((question) => !question.isExisting).length,
    skippedQuestionCount: questionPreviews.filter((question) => question.isExisting).length,
  };
}

function toCreateSectionPayloadFromTemplate(
  surveyId: string,
  section: QuestionSetTemplateSection,
  orderIndex: number,
): RawCreateSectionPayload {
  return {
    survey_id: surveyId,
    section_key: section.sectionKey,
    title_ko: section.title.ko,
    title_en: section.title.en ?? null,
    order_index: orderIndex,
    section_type: section.sectionType,
    settings: section.settings ?? {},
  };
}

function toCreateQuestionPayloadFromTemplate(
  surveyId: string,
  sectionId: string,
  question: QuestionSetTemplateQuestion,
  orderIndex: number,
  templateId: QuestionSetTemplate["templateId"],
): RawCreateQuestionPayload {
  return {
    survey_id: surveyId,
    section_id: sectionId,
    question_key: question.questionKey,
    question_type: question.questionType,
    title_ko: question.title.ko,
    title_en: question.title.en ?? null,
    order_index: orderIndex,
    is_required: question.isRequired,
    metric_type: question.metricType,
    topic_key: question.topicKey ?? null,
    space_key: question.spaceKey ?? null,
    config: withQuestionImportMetadata(question, templateId),
    validation: question.validation ?? {},
  };
}

function createNextQuestionOrderMap(questions: RawQuestion[]): Map<string, number> {
  const orderBySection = new Map<string, number>();
  for (const question of questions) {
    orderBySection.set(question.section_id, Math.max(orderBySection.get(question.section_id) ?? 0, question.order_index + 1));
  }
  return orderBySection;
}

function withQuestionImportMetadata(question: QuestionSetTemplateQuestion, templateId: QuestionSetTemplate["templateId"]): JsonRecord {
  const config: JsonRecord = {
    ...(question.config as JsonRecord),
    importSource: templateId,
    sourceNumber: question.sourceNumber,
  };
  if (question.displayGroup) {
    config.displayGroup = question.displayGroup;
  }
  if (question.displayGroupEn) {
    config.displayGroupEn = question.displayGroupEn;
  }
  return config;
}
