import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import type { AdminApiController } from "../../../api/admin/controller";
import { createFakeAdminApiController, fakeSurvey, fakeSurveyCollaborator } from "../../../test/fakeAdminApiController";
import { renderWithProviders } from "../../../test/renderWithProviders";
import { SurveySettingsPage } from "./SurveySettingsPage";

function renderSettings(overrides: Partial<AdminApiController> = {}) {
  return renderWithProviders(
    <MemoryRouter initialEntries={["/admin/surveys/survey-1/settings"]}>
      <Routes>
        <Route path="/admin/surveys/:surveyId/settings" element={<SurveySettingsPage />} />
      </Routes>
    </MemoryRouter>,
    {
      controller: createFakeAdminApiController(overrides),
    },
  );
}

describe("SurveySettingsPage", () => {
  it("lets owners add, update, and revoke survey collaborators", async () => {
    const user = userEvent.setup();
    const inviteSurveyCollaborator = vi.fn(async () => fakeSurveyCollaborator);
    const updateSurveyCollaboratorRole = vi.fn(async () => ({ ...fakeSurveyCollaborator, role: "manager" as const }));
    const revokeSurveyCollaborator = vi.fn(async () => ({ ...fakeSurveyCollaborator, revokedAt: "2026-05-28T03:00:00.000Z" }));

    renderSettings({
      listSurveyCollaborators: async () => [fakeSurveyCollaborator],
      inviteSurveyCollaborator,
      updateSurveyCollaboratorRole,
      revokeSurveyCollaborator,
    });

    await user.type(await screen.findByLabelText("공유할 이메일"), "editor@example.com");
    await user.selectOptions(screen.getByLabelText("공유 역할"), "manager");
    await user.click(screen.getByRole("button", { name: "등록" }));

    expect(inviteSurveyCollaborator).toHaveBeenCalledWith({
      surveyId: "survey-1",
      email: "editor@example.com",
      role: "manager",
    });

    await user.selectOptions(screen.getByLabelText("viewer@example.com 역할"), "manager");
    expect(updateSurveyCollaboratorRole).toHaveBeenCalledWith({
      collaboratorId: "survey-collaborator-1",
      surveyId: "survey-1",
      role: "manager",
    });

    await user.click(screen.getByRole("button", { name: "해제" }));
    expect(revokeSurveyCollaborator).toHaveBeenCalledWith({
      collaboratorId: "survey-collaborator-1",
      surveyId: "survey-1",
    });
  });

  it("lets invitation managers manage survey collaborators and settings", async () => {
    const user = userEvent.setup();
    const inviteSurveyCollaborator = vi.fn(async () => ({ ...fakeSurveyCollaborator, role: "editor" as const }));

    renderSettings({
      getSurveyDetail: async () => ({
        survey: { ...fakeSurvey, accessRole: "manager" },
        sections: [],
        questions: [],
        assets: [],
      }),
      listSurveyCollaborators: async () => [],
      inviteSurveyCollaborator,
    });

    await user.type(await screen.findByLabelText("공유할 이메일"), "editor@example.com");
    await user.selectOptions(screen.getByLabelText("공유 역할"), "editor");
    await user.click(screen.getByRole("button", { name: "등록" }));

    expect(inviteSurveyCollaborator).toHaveBeenCalledWith({
      surveyId: "survey-1",
      email: "editor@example.com",
      role: "editor",
    });
    expect(screen.getByText("아직 공유된 사용자가 없습니다.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "게시" })).toBeInTheDocument();
    expect(screen.getByLabelText("Public slug")).toBeInTheDocument();
  });

  it("blocks shared viewers from invitation settings", async () => {
    renderSettings({
      getSurveyDetail: async () => ({
        survey: { ...fakeSurvey, accessRole: "viewer" },
        sections: [],
        questions: [],
        assets: [],
      }),
    });

    expect(await screen.findByText("설문 설정을 변경할 수 없습니다.")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "게시" })).not.toBeInTheDocument();
    });
  });

  it("opens participant links on the production survey domain using public code when slug is empty", async () => {
    renderSettings();

    const openLink = await screen.findByRole("link", { name: "열기" });
    expect(screen.getByText("https://taglow.newdawn.co.kr/survey/8K2PQA")).toBeInTheDocument();
    expect(openLink).toHaveAttribute("href", "https://taglow.newdawn.co.kr/survey/8K2PQA");
  });

  it("prefers public slug over public code for participant links", async () => {
    renderSettings({
      getSurveyDetail: async () => ({
        survey: { ...fakeSurvey, publicSlug: "handong-dorm-2026", publicCode: "8K2PQA" },
        sections: [],
        questions: [],
        assets: [],
      }),
    });

    const openLink = await screen.findByRole("link", { name: "열기" });
    expect(screen.getByText("https://taglow.newdawn.co.kr/survey/handong-dorm-2026")).toBeInTheDocument();
    expect(openLink).toHaveAttribute("href", "https://taglow.newdawn.co.kr/survey/handong-dorm-2026");
  });

  it("saves scheduled publish and close times through the admin update mutation", async () => {
    const user = userEvent.setup();
    const updateSurvey = vi.fn(async () => fakeSurvey);
    renderSettings({ updateSurvey });

    const startsAtInput = await screen.findByLabelText("설문 게시 시간");
    const endsAtInput = screen.getByLabelText("설문 종료 시간");

    await user.type(startsAtInput, "2026-06-05T09:30");
    await user.type(endsAtInput, "2026-06-12T18:00");
    await user.click(screen.getByRole("button", { name: "예약 저장" }));

    expect(updateSurvey).toHaveBeenCalledWith({
      surveyId: "survey-1",
      startsAt: new Date("2026-06-05T09:30").toISOString(),
      endsAt: new Date("2026-06-12T18:00").toISOString(),
    });
  });

  it("explains one-sided schedule behavior", async () => {
    renderSettings();

    expect(await screen.findByText("게시 시간만 설정하면 게시만 자동으로 처리되고, 마감은 수동으로 종료합니다.")).toBeInTheDocument();
    expect(screen.getByText("마감 시간만 설정하면 이미 게시된 설문만 자동으로 종료되고, 게시는 수동으로 해야 합니다.")).toBeInTheDocument();
  });

  it("saves participant login screen copy into survey settings", async () => {
    const user = userEvent.setup();
    const updateSurvey = vi.fn(async () => fakeSurvey);
    renderSettings({ updateSurvey });

    await user.type(await screen.findByLabelText("대표 문구 한국어"), "목소리를 더 선명하게 모읍니다.");
    await user.type(screen.getByLabelText("대표 문구 영어"), "We gather your voice with more clarity.");
    await user.type(screen.getByLabelText("설명 문단 1 한국어"), "Taglow는 현장의 의견을 기록합니다.");
    await user.type(screen.getByLabelText("설명 문단 1 영어"), "Taglow records feedback from the field.");
    await user.type(screen.getByLabelText("설명 문단 2 한국어"), "이번 설문은 자치회와 뉴던이 함께 진행합니다.");
    await user.type(screen.getByLabelText("설명 문단 2 영어"), "This survey is conducted with NewDawn.");
    await user.click(screen.getByRole("button", { name: "화면 문구 저장" }));

    expect(updateSurvey).toHaveBeenCalledWith({
      surveyId: "survey-1",
      settings: {
        participantLogin: {
          headline: "목소리를 더 선명하게 모읍니다.",
          headlineEn: "We gather your voice with more clarity.",
          bodyParagraphs: ["Taglow는 현장의 의견을 기록합니다.", "이번 설문은 자치회와 뉴던이 함께 진행합니다."],
          bodyParagraphsEn: ["Taglow records feedback from the field.", "This survey is conducted with NewDawn."],
        },
      },
    });
  });

  it("uploads participant login images and stores the asset id in survey settings", async () => {
    const user = userEvent.setup();
    const uploadSurveyImage = vi.fn(async () => ({
      id: "login-header-asset",
      surveyId: "survey-1",
      assetType: "image" as const,
      storageBucket: "survey-assets",
      storagePath: "surveys/survey-1/images/header.png",
      metadata: { signedUrl: "https://example.com/header.png" },
      createdAt: "2026-05-28T00:00:00.000Z",
    }));
    const updateSurvey = vi.fn(async () => fakeSurvey);
    renderSettings({ uploadSurveyImage, updateSurvey });

    const file = new File(["header"], "header.png", { type: "image/png" });
    await user.upload(await screen.findByLabelText("상단 이미지 업로드"), file);

    expect(uploadSurveyImage).toHaveBeenCalledWith({
      surveyId: "survey-1",
      file,
      metadata: { usage: "participant_login_header" },
    });
    expect(updateSurvey).toHaveBeenCalledWith({
      surveyId: "survey-1",
      settings: {
        participantLogin: {
          headerImageAssetId: "login-header-asset",
          bodyParagraphs: ["", ""],
          bodyParagraphsEn: ["", ""],
        },
      },
    });
  });
});
