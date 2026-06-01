import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import type { ParticipantSurveyDetail } from "../../../api/participant";
import { createFakeParticipantSurveyController, fakeParticipantSurveyDetail } from "../../../test/fakeParticipantSurveyController";
import { renderWithProviders } from "../../../test/renderWithProviders";
import { ParticipantSurveyPage } from "./ParticipantSurveyPage";

function renderParticipantSurveyPage() {
  const getPublishedSurveyByIdentifier = vi.fn(async () => fakeParticipantSurveyDetail);
  renderWithProviders(
    <MemoryRouter initialEntries={["/survey/handong-dorm-2026"]}>
      <Routes>
        <Route path="/survey/:publicIdentifier" element={<ParticipantSurveyPage />} />
      </Routes>
    </MemoryRouter>,
    {
      participantController: createFakeParticipantSurveyController({
        getPublishedSurveyByIdentifier,
      }),
    },
  );
  return { getPublishedSurveyByIdentifier };
}

async function startSurveyFlow(user: ReturnType<typeof userEvent.setup>) {
  expect(await screen.findByRole("heading", { name: "로그인" })).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "인트로로 이동" }));
  expect(await screen.findByRole("heading", { name: "생활관 만족도 조사" })).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "섹션 시작" }));
}

describe("ParticipantSurveyPage", () => {
  it("starts from login, then intro, then the first section", async () => {
    const user = userEvent.setup();
    const { getPublishedSurveyByIdentifier } = renderParticipantSurveyPage();

    expect(await screen.findByRole("heading", { name: "로그인" })).toBeInTheDocument();
    expect(screen.queryByText("침대 만족도는 어떤가요?")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "인트로로 이동" }));
    expect(await screen.findByRole("heading", { name: "생활관 만족도 조사" })).toBeInTheDocument();
    expect(screen.getByText("2026 봄학기")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "섹션 시작" }));
    expect(screen.getByText("생활관 시설")).toBeInTheDocument();
    expect(screen.getByText("침대 만족도는 어떤가요?")).toBeInTheDocument();
    expect(getPublishedSurveyByIdentifier).toHaveBeenCalledWith("handong-dorm-2026");
  });

  it("starts unauthenticated participants from Google login", async () => {
    const user = userEvent.setup();
    const signInWithGoogle = vi.fn(async () => undefined);
    renderWithProviders(
      <MemoryRouter initialEntries={["/survey/handong-dorm-2026"]}>
        <Routes>
          <Route path="/survey/:publicIdentifier" element={<ParticipantSurveyPage />} />
        </Routes>
      </MemoryRouter>,
      {
        participantController: createFakeParticipantSurveyController({
          getParticipantSessionState: async () => ({ isAuthenticated: false }),
          signInWithGoogle,
        }),
      },
    );

    expect(await screen.findByRole("heading", { name: "로그인" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Google로 로그인" }));

    expect(signInWithGoogle).toHaveBeenCalledWith({ redirectTo: "http://localhost:3000/survey/handong-dorm-2026" });
  });

  it("auto-links safe URLs in the survey intro copy", async () => {
    const user = userEvent.setup();
    const detail: ParticipantSurveyDetail = {
      ...fakeParticipantSurveyDetail,
      survey: {
        ...fakeParticipantSurveyDetail.survey,
        description: { ko: "자세한 내용은 https://example.com 을 확인해주세요.\n참고: www.handong.edu\njavascript:alert(1)" },
      },
    };
    renderWithProviders(
      <MemoryRouter initialEntries={["/survey/handong-dorm-2026"]}>
        <Routes>
          <Route path="/survey/:publicIdentifier" element={<ParticipantSurveyPage />} />
        </Routes>
      </MemoryRouter>,
      {
        participantController: createFakeParticipantSurveyController({
          getPublishedSurveyByIdentifier: async () => detail,
        }),
      },
    );

    expect(await screen.findByRole("heading", { name: "로그인" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "인트로로 이동" }));

    const httpsLink = await screen.findByRole("link", { name: "https://example.com" });
    expect(httpsLink).toHaveAttribute("href", "https://example.com");
    expect(httpsLink).toHaveAttribute("target", "_blank");
    expect(httpsLink).toHaveAttribute("rel", "noreferrer noopener");

    const wwwLink = screen.getByRole("link", { name: "www.handong.edu" });
    expect(wwwLink).toHaveAttribute("href", "https://www.handong.edu");
    expect(screen.queryByRole("link", { name: "javascript:alert(1)" })).not.toBeInTheDocument();
    expect(screen.getByText("자세한 내용은", { exact: false })).toBeInTheDocument();
  });

  it("lets participants upload an image and add tags for tagging suggestion questions", async () => {
    const user = userEvent.setup();
    const detail: ParticipantSurveyDetail = {
      ...fakeParticipantSurveyDetail,
      questions: [
        {
          ...fakeParticipantSurveyDetail.questions[0],
          id: "question-upload",
          questionKey: "facility_upload_tag",
          questionType: "participant_image_tag",
          title: { ko: "건의할 사진을 올리고 위치를 표시해주세요." },
          metricType: "none",
          config: {
            maxTags: 2,
            tagTypes: ["수리 요청", "개선 제안"],
            requireText: true,
            enableZoom: true,
            acceptedMimeTypes: ["image/png"],
            maxFileSizeMb: 10,
          },
        },
      ],
    };
    const uploadQuestionImage = vi.fn(async () => ({
      storageBucket: "survey-assets",
      storagePath: "participant-uploads/survey-1/user-1/question-upload/upload.png",
      signedUrl: "https://example.com/upload.png",
      metadata: {},
    }));
    renderWithProviders(
      <MemoryRouter initialEntries={["/survey/handong-dorm-2026"]}>
        <Routes>
          <Route path="/survey/:publicIdentifier" element={<ParticipantSurveyPage />} />
        </Routes>
      </MemoryRouter>,
      {
        participantController: createFakeParticipantSurveyController({
          getPublishedSurveyByIdentifier: async () => detail,
          uploadQuestionImage,
        }),
      },
    );

    await startSurveyFlow(user);
    expect(await screen.findByRole("heading", { name: "건의할 사진을 올리고 위치를 표시해주세요." })).toBeInTheDocument();
    const file = new File(["image"], "upload.png", { type: "image/png" });

    await user.upload(screen.getByLabelText("사진 업로드"), file);
    expect(uploadQuestionImage).toHaveBeenCalledWith({ surveyId: "survey-1", questionId: "question-upload", file });

    await user.click(screen.getByRole("button", { name: "이미지 태깅 영역" }));

    expect(screen.getByText("태그 1")).toBeInTheDocument();
    expect(screen.getByLabelText("태그 1 카테고리")).toHaveValue("수리 요청");
  });

  it("submits collected answers from the complete step", async () => {
    const user = userEvent.setup();
    const submitSurveyResponse = vi.fn(async () => ({
      responseId: "response-1",
      submittedAt: "2026-05-28T00:00:00.000Z",
      alreadySubmitted: false,
      passedAttentionCheck: true,
    }));
    renderWithProviders(
      <MemoryRouter initialEntries={["/survey/handong-dorm-2026"]}>
        <Routes>
          <Route path="/survey/:publicIdentifier" element={<ParticipantSurveyPage />} />
        </Routes>
      </MemoryRouter>,
      {
        participantController: createFakeParticipantSurveyController({
          submitSurveyResponse,
        }),
      },
    );

    await startSurveyFlow(user);
    await user.click(screen.getByRole("button", { name: /5/ }));
    await user.click(screen.getByRole("button", { name: "완료" }));
    await user.click(screen.getByRole("button", { name: "응답 제출" }));

    expect(await screen.findByRole("heading", { name: "응답을 제출했습니다." })).toBeInTheDocument();
    expect(submitSurveyResponse).toHaveBeenCalledWith(expect.objectContaining({
      surveyId: "survey-1",
      answers: [
        expect.objectContaining({
          questionId: "question-1",
          scoreValue: 5,
        }),
      ],
    }));
  });

  it("renders scale, single choice, multi choice, short text, plain text, and choice-first text controls", async () => {
    const user = userEvent.setup();
    const detail: ParticipantSurveyDetail = {
      ...fakeParticipantSurveyDetail,
      questions: [
        {
          ...fakeParticipantSurveyDetail.questions[0],
          config: {
            scaleMin: 1,
            scaleMax: 5,
            labelsKo: ["매우 불만족", "불만족", "보통", "만족", "매우 만족"],
          },
        },
        {
          ...fakeParticipantSurveyDetail.questions[0],
          id: "question-single",
          questionKey: "needed_space",
          questionType: "single_choice",
          title: { ko: "가장 필요한 시설은 무엇인가요?" },
          orderIndex: 1,
          metricType: "none",
          config: {
            options: [
              { value: "lounge", labelKo: "휴게실" },
              { value: "study", labelKo: "공부 공간" },
            ],
          },
        },
        {
          ...fakeParticipantSurveyDetail.questions[0],
          id: "question-multi",
          questionKey: "used_time",
          questionType: "multi_select",
          title: { ko: "주로 사용하는 시간대를 선택해주세요." },
          orderIndex: 2,
          metricType: "none",
          config: {
            options: [
              { value: "morning", labelKo: "오전" },
              { value: "evening", labelKo: "저녁" },
            ],
          },
        },
        {
          ...fakeParticipantSurveyDetail.questions[0],
          id: "question-short-text",
          questionKey: "student_id",
          questionType: "text",
          title: { ko: "학번을 입력해주세요." },
          orderIndex: 3,
          metricType: "none",
          config: { textMode: "short", multiline: false, maxLength: 20 },
        },
        {
          ...fakeParticipantSurveyDetail.questions[0],
          id: "question-text",
          questionKey: "plain_feedback",
          questionType: "text",
          title: { ko: "의견을 적어주세요." },
          orderIndex: 4,
          metricType: "none",
          config: { textMode: "plain", multiline: true, maxLength: 1000 },
        },
        {
          ...fakeParticipantSurveyDetail.questions[0],
          id: "question-choice-text",
          questionKey: "categorized_feedback",
          questionType: "text",
          title: { ko: "분류 후 의견을 적어주세요." },
          orderIndex: 5,
          metricType: "none",
          config: {
            textMode: "choice_then_text",
            options: [
              { value: "complaint", labelKo: "불편" },
              { value: "praise", labelKo: "칭찬" },
            ],
          },
        },
      ],
    };
    renderWithProviders(
      <MemoryRouter initialEntries={["/survey/handong-dorm-2026"]}>
        <Routes>
          <Route path="/survey/:publicIdentifier" element={<ParticipantSurveyPage />} />
        </Routes>
      </MemoryRouter>,
      {
        participantController: createFakeParticipantSurveyController({
          getPublishedSurveyByIdentifier: async () => detail,
        }),
      },
    );

    await startSurveyFlow(user);

    await user.click(screen.getByRole("button", { name: /5/ }));
    await user.click(screen.getByLabelText("휴게실"));
    await user.click(screen.getByLabelText("오전"));
    await user.click(screen.getByLabelText("저녁"));
    await user.type(screen.getByLabelText("단답형 답변"), "22400001");
    await user.type(screen.getByLabelText("답변"), "단순 의견입니다.");
    await user.click(screen.getByLabelText("불편"));
    await user.type(screen.getByLabelText("상세 답변"), "분류된 의견입니다.");

    expect(screen.getByRole("button", { name: /5/ })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByLabelText("휴게실")).toBeChecked();
    expect(screen.getByLabelText("오전")).toBeChecked();
    expect(screen.getByLabelText("저녁")).toBeChecked();
    expect(screen.getByLabelText("단답형 답변")).toHaveValue("22400001");
    expect(screen.getByLabelText("답변")).toHaveValue("단순 의견입니다.");
    expect(screen.getByLabelText("불편")).toBeChecked();
    expect(screen.getByLabelText("상세 답변")).toHaveValue("분류된 의견입니다.");
  });
});
