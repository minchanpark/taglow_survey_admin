import { screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { RequireAdminShell } from "./routeGuards";
import {
  activeAdminSession,
  createFakeAdminApiController,
  fakeSurvey,
  nonMemberSession,
  sharedSurveySession,
  unauthenticatedSession,
} from "../test/fakeAdminApiController";
import { renderWithProviders } from "../test/renderWithProviders";

function renderGuard(session = activeAdminSession, initialEntry = "/admin/surveys") {
  return renderWithProviders(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/admin/login" element={<div>login route</div>} />
        <Route path="/admin/access-denied" element={<div>denied route</div>} />
        <Route path="/admin" element={<RequireAdminShell />}>
          <Route path="surveys" element={<div>survey route</div>} />
          <Route path="surveys/:surveyId/dashboard" element={<div>survey dashboard route</div>} />
          <Route path="surveys/:surveyId/builder" element={<div>survey builder route</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
    {
      controller: createFakeAdminApiController({
        getAdminSessionState: async () => session,
      }),
    },
  );
}

describe("RequireAdminShell", () => {
  it("redirects unauthenticated users to login", async () => {
    renderGuard(unauthenticatedSession);

    expect(await screen.findByText("login route")).toBeInTheDocument();
  });

  it("redirects users without an active admin member row to access denied", async () => {
    renderGuard(nonMemberSession);

    expect(await screen.findByText("denied route")).toBeInTheDocument();
  });

  it("renders admin routes for active admin members", async () => {
    renderGuard(activeAdminSession);

    expect(await screen.findByText("survey route")).toBeInTheDocument();
    expect(screen.getByText("admin@example.com")).toBeInTheDocument();
  });

  it("renders admin routes for users who only have shared survey access", async () => {
    renderGuard(sharedSurveySession);

    expect(await screen.findByText("survey route")).toBeInTheDocument();
    expect(screen.getByText("viewer@example.com")).toBeInTheDocument();
    expect(screen.getByText("공유 사용자")).toBeInTheDocument();
  });

  it("enables selected-survey navigation when a survey id is in the route", async () => {
    renderGuard(activeAdminSession, "/admin/surveys/survey-1/dashboard");

    expect(await screen.findByText("survey dashboard route")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /빌더/ })).toHaveAttribute("href", "/admin/surveys/survey-1/builder");
  });

  it("hides builder and settings navigation for shared viewer surveys", async () => {
    renderWithProviders(
      <MemoryRouter initialEntries={["/admin/surveys/survey-1/dashboard"]}>
        <Routes>
          <Route path="/admin/login" element={<div>login route</div>} />
          <Route path="/admin/access-denied" element={<div>denied route</div>} />
          <Route path="/admin" element={<RequireAdminShell />}>
            <Route path="surveys/:surveyId/dashboard" element={<div>survey dashboard route</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
      {
        controller: createFakeAdminApiController({
          getAdminSessionState: async () => sharedSurveySession,
          getSurveyDetail: async () => ({
            survey: { ...fakeSurvey, accessRole: "viewer" },
            sections: [],
            questions: [],
            assets: [],
          }),
        }),
      },
    );

    expect(await screen.findByText("survey dashboard route")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /빌더/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /설정/ })).not.toBeInTheDocument();
  });

  it("shows shared users with the shared account label even when the selected survey is editable", async () => {
    renderWithProviders(
      <MemoryRouter initialEntries={["/admin/surveys/survey-1/dashboard"]}>
        <Routes>
          <Route path="/admin/login" element={<div>login route</div>} />
          <Route path="/admin/access-denied" element={<div>denied route</div>} />
          <Route path="/admin" element={<RequireAdminShell />}>
            <Route path="surveys/:surveyId/dashboard" element={<div>survey dashboard route</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
      {
        controller: createFakeAdminApiController({
          getAdminSessionState: async () => sharedSurveySession,
          getSurveyDetail: async () => ({
            survey: { ...fakeSurvey, accessRole: "editor" },
            sections: [],
            questions: [],
            assets: [],
          }),
        }),
      },
    );

    expect(await screen.findByText("survey dashboard route")).toBeInTheDocument();
    expect(screen.getByText("공유 사용자")).toBeInTheDocument();
    expect(screen.queryByText("viewer")).not.toBeInTheDocument();
    expect(screen.queryByText("editor")).not.toBeInTheDocument();
  });

  it("shows settings navigation for shared invitation manager surveys", async () => {
    renderWithProviders(
      <MemoryRouter initialEntries={["/admin/surveys/survey-1/dashboard"]}>
        <Routes>
          <Route path="/admin/login" element={<div>login route</div>} />
          <Route path="/admin/access-denied" element={<div>denied route</div>} />
          <Route path="/admin" element={<RequireAdminShell />}>
            <Route path="surveys/:surveyId/dashboard" element={<div>survey dashboard route</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
      {
        controller: createFakeAdminApiController({
          getAdminSessionState: async () => sharedSurveySession,
          getSurveyDetail: async () => ({
            survey: { ...fakeSurvey, accessRole: "manager" },
            sections: [],
            questions: [],
            assets: [],
          }),
        }),
      },
    );

    expect(await screen.findByText("survey dashboard route")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /빌더/ })).toHaveAttribute("href", "/admin/surveys/survey-1/builder");
    expect(screen.getByRole("link", { name: /설정/ })).toHaveAttribute("href", "/admin/surveys/survey-1/settings");
  });
});
