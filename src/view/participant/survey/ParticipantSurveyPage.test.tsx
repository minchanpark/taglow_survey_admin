import { screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
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
});
