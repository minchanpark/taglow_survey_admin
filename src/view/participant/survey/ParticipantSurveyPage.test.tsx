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

describe("ParticipantSurveyPage", () => {
  it("loads a published survey by public identifier", async () => {
    const { getPublishedSurveyByIdentifier } = renderParticipantSurveyPage();

    expect(await screen.findByRole("heading", { name: "생활관 만족도 조사" })).toBeInTheDocument();
    expect(screen.getByText("생활관 시설")).toBeInTheDocument();
    expect(screen.getByText("침대 만족도는 어떤가요?")).toBeInTheDocument();
    expect(getPublishedSurveyByIdentifier).toHaveBeenCalledWith("handong-dorm-2026");
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

    expect(await screen.findByRole("heading", { name: "건의할 사진을 올리고 위치를 표시해주세요." })).toBeInTheDocument();
    const file = new File(["image"], "upload.png", { type: "image/png" });

    await user.upload(screen.getByLabelText("사진 업로드"), file);
    expect(uploadQuestionImage).toHaveBeenCalledWith({ surveyId: "survey-1", questionId: "question-upload", file });

    await user.click(screen.getByRole("button", { name: "이미지 태깅 영역" }));

    expect(screen.getByText("태그 1")).toBeInTheDocument();
    expect(screen.getByLabelText("태그 1 카테고리")).toHaveValue("수리 요청");
  });
});
