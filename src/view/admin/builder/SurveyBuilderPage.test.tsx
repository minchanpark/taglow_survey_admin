import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AdminApiController } from "../../../api/admin/controller";
import type {
  CreateQuestionCommand,
  CreateSectionCommand,
  Question,
  SurveyAsset,
  SurveySection,
  UpdateQuestionCommand,
  UpdateSectionCommand,
} from "../../../api/admin/model";
import { useAdminBuilderStore } from "../../../store";
import { createFakeAdminApiController, fakeSurvey } from "../../../test/fakeAdminApiController";
import { renderWithProviders } from "../../../test/renderWithProviders";
import { SurveyBuilderPage } from "./SurveyBuilderPage";

const section: SurveySection = {
  id: "section-1",
  surveyId: "survey-1",
  sectionKey: "facility",
  title: { ko: "시설" },
  orderIndex: 0,
  sectionType: "general",
  settings: {},
};

const cafeteriaSection: SurveySection = {
  id: "section-2",
  surveyId: "survey-1",
  sectionKey: "cafeteria",
  title: { ko: "식당" },
  orderIndex: 1,
  sectionType: "facility",
  settings: {},
};

const question: Question = {
  id: "question-1",
  surveyId: "survey-1",
  sectionId: "section-1",
  questionKey: "bed_satisfaction",
  questionType: "scale",
  title: { ko: "침대 상태에 만족하시나요?" },
  orderIndex: 0,
  isRequired: true,
  metricType: "satisfaction",
  config: {
    scaleMin: 1,
    scaleMax: 5,
    labelsKo: ["매우 불만족", "불만족", "보통", "만족", "매우 만족"],
  },
  validation: {},
};

const imageTagQuestion: Question = {
  id: "question-image",
  surveyId: "survey-1",
  sectionId: "section-1",
  questionKey: "facility_tag",
  questionType: "image_tag",
  title: { ko: "불편한 위치를 표시해주세요." },
  orderIndex: 1,
  isRequired: false,
  metricType: "none",
  config: {
    maxTags: 3,
    tagTypes: ["불편"],
    requireText: true,
    enableZoom: true,
  },
  validation: {},
};

const uploadedAsset: SurveyAsset = {
  id: "asset-1",
  surveyId: "survey-1",
  questionId: "question-image",
  assetType: "image",
  storageBucket: "survey-assets",
  storagePath: "surveys/survey-1/images/facility.png",
  metadata: {},
  createdAt: "2026-05-28T00:00:00.000Z",
};

function renderBuilder(
  overrides: Partial<AdminApiController> = {},
  fixtures: { sections?: SurveySection[]; questions?: Question[]; assets?: SurveyAsset[] } = {},
) {
  return renderWithProviders(
    <MemoryRouter initialEntries={["/admin/surveys/survey-1/builder"]}>
      <Routes>
        <Route path="/admin/surveys/:surveyId/builder" element={<SurveyBuilderPage />} />
      </Routes>
    </MemoryRouter>,
    {
      controller: createFakeAdminApiController({
        getSurveyDetail: async () => ({
          survey: fakeSurvey,
          sections: fixtures.sections ?? [section],
          questions: fixtures.questions ?? [question],
          assets: fixtures.assets ?? [],
        }),
        ...overrides,
      }),
    },
  );
}

describe("SurveyBuilderPage", () => {
  beforeEach(() => {
    useAdminBuilderStore.getState().resetBuilderSelection();
  });

  it("creates sections through the admin API boundary", async () => {
    const user = userEvent.setup();
    const createSection = vi.fn<AdminApiController["createSection"]>(async (command: CreateSectionCommand) => ({
      ...section,
      id: "section-2",
      sectionKey: command.sectionKey,
      title: command.title,
      orderIndex: command.orderIndex,
      sectionType: command.sectionType ?? "general",
    }));
    renderBuilder({ createSection });

    await screen.findByRole("heading", { name: "생활관 만족도 조사" });
    await user.type(screen.getByLabelText("새 섹션"), "식당");
    await user.click(screen.getByRole("button", { name: "섹션 추가" }));

    await waitFor(() => {
      expect(createSection).toHaveBeenCalledWith({
        surveyId: "survey-1",
        sectionKey: expect.stringMatching(/^section_/),
        title: { ko: "식당" },
        orderIndex: 1,
        sectionType: "general",
        settings: {},
      });
    });
  });

  it("creates questions with default config and analysis metadata", async () => {
    const user = userEvent.setup();
    const createQuestion = vi.fn<AdminApiController["createQuestion"]>(async (command: CreateQuestionCommand) => ({
      ...question,
      id: "question-2",
      questionKey: command.questionKey,
      title: command.title,
      questionType: command.questionType,
      orderIndex: command.orderIndex,
      metricType: command.metricType ?? "none",
      config: command.config ?? {},
    }));
    const reorderQuestions = vi.fn<AdminApiController["reorderQuestions"]>(async (command) =>
      command.questionIds.map((questionId, index) => ({
        ...(questionId === "question-2" ? { ...question, id: "question-2", title: { ko: "책상 상태에 만족하시나요?" } } : question),
        orderIndex: index,
      })),
    );
    renderBuilder({ createQuestion, reorderQuestions });

    await screen.findByRole("heading", { name: "생활관 만족도 조사" });
    await user.click(screen.getByRole("button", { name: "침대 상태에 만족하시나요? 아래에 새 질문 추가" }));
    const createEditor = screen.getByRole("complementary", { name: "질문 추가" });
    await user.type(within(createEditor).getByLabelText("새 질문"), "책상 상태에 만족하시나요?");
    await user.type(within(createEditor).getByLabelText("질문 키"), "desk_satisfaction");
    await user.click(within(createEditor).getByRole("button", { name: "질문 추가" }));

    await waitFor(() => {
      expect(createQuestion).toHaveBeenCalledWith({
        surveyId: "survey-1",
        sectionId: "section-1",
        questionKey: "desk_satisfaction",
        questionType: "scale",
        title: { ko: "책상 상태에 만족하시나요?" },
        orderIndex: 1,
        isRequired: true,
        metricType: "satisfaction",
        config: {
          scaleMin: 1,
          scaleMax: 5,
          labelsKo: ["매우 불만족", "불만족", "보통", "만족", "매우 만족"],
        },
        validation: {},
      });
    });
    await waitFor(() => {
      expect(reorderQuestions).toHaveBeenCalledWith({
        surveyId: "survey-1",
        sectionId: "section-1",
        questionIds: ["question-1", "question-2"],
      });
    });
  });

  it("keeps the question editor closed until a question node is selected", async () => {
    const user = userEvent.setup();
    renderBuilder();

    await screen.findByRole("heading", { name: "생활관 만족도 조사" });

    expect(screen.queryByRole("complementary", { name: "질문 편집" })).not.toBeInTheDocument();
    expect(screen.getByRole("complementary", { name: "질문 작업" })).toHaveTextContent("선택된 질문이 없습니다.");

    await user.click(screen.getByRole("button", { name: "침대 상태에 만족하시나요? 질문 선택" }));

    expect(screen.getByRole("complementary", { name: "질문 편집" })).toBeInTheDocument();
  });

  it("reorders questions from the arrow controls", async () => {
    const user = userEvent.setup();
    let currentQuestions = [question, imageTagQuestion];
    const reorderQuestions = vi.fn<AdminApiController["reorderQuestions"]>(async (command) => {
      currentQuestions = command.questionIds.map((questionId, index) => ({
        ...currentQuestions.find((item) => item.id === questionId)!,
        orderIndex: index,
      }));
      return currentQuestions;
    });
    renderBuilder({
      getSurveyDetail: async () => ({
        survey: fakeSurvey,
        sections: [section],
        questions: currentQuestions,
        assets: [],
      }),
      reorderQuestions,
    });

    await screen.findByRole("heading", { name: "생활관 만족도 조사" });
    const questionList = screen.getByRole("list", { name: "질문 목록" });
    await user.click(within(questionList).getByRole("button", { name: "불편한 위치를 표시해주세요. 위로 이동" }));

    await waitFor(() => {
      expect(reorderQuestions).toHaveBeenCalledWith({
        surveyId: "survey-1",
        sectionId: "section-1",
        questionIds: ["question-image", "question-1"],
      });
    });
    await waitFor(() => {
      const questionNodes = within(questionList).getAllByRole("button", { name: /질문 선택$/ });
      expect(questionNodes[0]).toHaveTextContent("불편한 위치를 표시해주세요.");
      expect(questionNodes[1]).toHaveTextContent("침대 상태에 만족하시나요?");
    });
  });

  it("updates the selected section through the admin API boundary", async () => {
    const user = userEvent.setup();
    const updateSection = vi.fn<AdminApiController["updateSection"]>(async (command: UpdateSectionCommand) => ({
      ...section,
      id: command.sectionId,
      title: command.title ?? section.title,
      description: command.description,
      sectionType: command.sectionType ?? section.sectionType,
      settings: command.settings ?? section.settings,
    }));
    renderBuilder({ updateSection });

    await screen.findByRole("heading", { name: "생활관 만족도 조사" });
    const sectionPanel = screen.getByRole("complementary", { name: "섹션" });
    const titleInput = await within(sectionPanel).findByLabelText("한국어 제목");
    await user.clear(titleInput);
    await user.type(titleInput, "생활관 시설");
    await user.click(within(sectionPanel).getByRole("button", { name: "저장" }));

    await waitFor(() => {
      expect(updateSection).toHaveBeenCalledWith({
        surveyId: "survey-1",
        sectionId: "section-1",
        sectionKey: "facility",
        title: { ko: "생활관 시설" },
        description: undefined,
        sectionType: "general",
        settings: {},
      });
    });
    expect(await within(sectionPanel).findByRole("status")).toHaveTextContent("섹션이 저장되었습니다.");
  });

  it("adds a question to the section selected from that section card", async () => {
    const user = userEvent.setup();
    const createQuestion = vi.fn<AdminApiController["createQuestion"]>(async (command: CreateQuestionCommand) => ({
      ...question,
      id: "question-2",
      sectionId: command.sectionId,
      questionKey: command.questionKey,
      title: command.title,
      questionType: command.questionType,
      orderIndex: command.orderIndex,
      metricType: command.metricType ?? "none",
      config: command.config ?? {},
    }));
    renderBuilder({ createQuestion }, { sections: [section, cafeteriaSection], questions: [question] });

    await screen.findByRole("heading", { name: "생활관 만족도 조사" });
    await user.click(screen.getByRole("button", { name: "식당에 질문 추가" }));
    expect(screen.getByText("현재 섹션: 식당")).toBeInTheDocument();

    const createEditor = screen.getByRole("complementary", { name: "질문 추가" });
    await user.type(within(createEditor).getByLabelText("새 질문"), "식당 이용 경험이 있나요?");
    await user.type(within(createEditor).getByLabelText("질문 키"), "cafeteria_experience");
    await user.click(within(createEditor).getByRole("button", { name: "질문 추가" }));

    await waitFor(() => {
      expect(createQuestion).toHaveBeenCalledWith(
        expect.objectContaining({
          surveyId: "survey-1",
          sectionId: "section-2",
          questionKey: "cafeteria_experience",
          title: { ko: "식당 이용 경험이 있나요?" },
          orderIndex: 0,
        }),
      );
    });
  });

  it("updates the selected question through the admin API boundary", async () => {
    const user = userEvent.setup();
    const updateQuestion = vi.fn<AdminApiController["updateQuestion"]>(async (command: UpdateQuestionCommand) => ({
      ...question,
      id: command.questionId,
      questionType: command.questionType ?? question.questionType,
      title: command.title ?? question.title,
      description: command.description,
      isRequired: command.isRequired ?? question.isRequired,
      metricType: command.metricType ?? question.metricType,
      topicKey: command.topicKey,
      spaceKey: command.spaceKey,
      config: command.config ?? question.config,
      validation: command.validation ?? question.validation,
    }));
    renderBuilder({ updateQuestion });

    await screen.findByRole("heading", { name: "생활관 만족도 조사" });
    await user.click(screen.getByRole("button", { name: "침대 상태에 만족하시나요? 질문 선택" }));
    const editor = screen.getByRole("complementary", { name: "질문 편집" });

    await user.selectOptions(within(editor).getByLabelText("질문 유형"), "single_choice");
    await user.clear(within(editor).getByLabelText("topic key"));
    await user.type(within(editor).getByLabelText("topic key"), "bed");
    await user.click(within(editor).getByRole("button", { name: "저장" }));

    await waitFor(() => {
      expect(updateQuestion).toHaveBeenCalledWith({
        surveyId: "survey-1",
        questionId: "question-1",
        questionKey: "bed_satisfaction",
        questionType: "single_choice",
        title: { ko: "침대 상태에 만족하시나요?" },
        description: undefined,
        isRequired: true,
        metricType: "none",
        topicKey: "bed",
        spaceKey: undefined,
        config: {
          options: [{ value: "option_1", labelKo: "선택지 1" }],
        },
        validation: {},
      });
    });
    expect(await within(editor).findByRole("status")).toHaveTextContent("질문이 저장되었습니다.");
  });

  it("previews and imports the dorm question set from the builder", async () => {
    const user = userEvent.setup();
    const importQuestionSet = vi.fn<AdminApiController["importQuestionSet"]>(async (command) => ({
      templateId: command.templateId,
      sectionsCreated: 8,
      questionsCreated: 195,
      questionsSkipped: 0,
      sectionKeys: [],
      questionKeys: [],
    }));
    renderBuilder({ importQuestionSet });

    await screen.findByRole("heading", { name: "생활관 만족도 조사" });
    await user.click(screen.getByRole("button", { name: "질문 목록 불러오기" }));

    expect(await screen.findByRole("dialog", { name: "질문 목록 불러오기" })).toBeInTheDocument();
    expect(screen.getAllByText("195개").length).toBeGreaterThan(0);
    expect(screen.getAllByText("8개").length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: "현재 설문에 삽입" }));

    await waitFor(() => {
      expect(importQuestionSet).toHaveBeenCalledWith({
        surveyId: "survey-1",
        templateId: "dorm_regular_25_2",
        conflictMode: "append_skip_existing_keys",
      });
    });
  });

  it("uploads and links an image asset for image tag questions", async () => {
    const user = userEvent.setup();
    const uploadSurveyImage = vi.fn<AdminApiController["uploadSurveyImage"]>(async () => uploadedAsset);
    const updateQuestion = vi.fn<AdminApiController["updateQuestion"]>(async (command: UpdateQuestionCommand) => ({
      ...imageTagQuestion,
      id: command.questionId,
      config: command.config ?? imageTagQuestion.config,
    }));
    renderBuilder({ uploadSurveyImage, updateQuestion }, { questions: [imageTagQuestion] });

    await screen.findByRole("heading", { name: "생활관 만족도 조사" });
    await user.click(screen.getByRole("button", { name: "불편한 위치를 표시해주세요. 질문 선택" }));
    const editor = screen.getByRole("complementary", { name: "질문 편집" });
    const file = new File(["image"], "facility.png", { type: "image/png" });

    await user.upload(within(editor).getByLabelText("이미지 업로드"), file);

    await waitFor(() => {
      expect(uploadSurveyImage).toHaveBeenCalledWith({
        surveyId: "survey-1",
        sectionId: "section-1",
        questionId: "question-image",
        file,
        metadata: { usage: "question_image_tag" },
      });
    });

    await user.click(within(editor).getByRole("button", { name: "저장" }));

    await waitFor(() => {
      expect(updateQuestion).toHaveBeenCalledWith(
        expect.objectContaining({
          questionId: "question-image",
          questionType: "image_tag",
          config: expect.objectContaining({ assetId: "asset-1" }),
        }),
      );
    });
  });
});
