import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import type { AdminApiController } from "../../../api/admin/controller";
import { createFakeAdminApiController, sharedSurveySession, unauthenticatedSession } from "../../../test/fakeAdminApiController";
import { renderWithProviders } from "../../../test/renderWithProviders";
import { AdminLoginPage } from "./AdminLoginPage";

function renderLogin(overrides: Partial<AdminApiController> = {}) {
  return renderWithProviders(
    <MemoryRouter initialEntries={["/admin/login"]}>
      <Routes>
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/admin/access-denied" element={<div>access request route</div>} />
        <Route path="/admin/surveys" element={<div>survey route</div>} />
      </Routes>
    </MemoryRouter>,
    {
      controller: createFakeAdminApiController({
        getAdminSessionState: async () => unauthenticatedSession,
        ...overrides,
      }),
    },
  );
}

describe("AdminLoginPage", () => {
  it("uses the admin login route as the Google auth redirect URL", async () => {
    const user = userEvent.setup();
    const signInWithGoogle = vi.fn<AdminApiController["signInWithGoogle"]>(async () => undefined);
    renderLogin({ signInWithGoogle });

    await user.click(await screen.findByRole("button", { name: "Google로 로그인" }));

    expect(signInWithGoogle).toHaveBeenCalledWith({
      redirectTo: new URL("/admin/login", window.location.origin).toString(),
    });
  });

  it("redirects authenticated users without active admin access to the access request route", async () => {
    renderLogin({
      getAdminSessionState: async () => ({
        isAuthenticated: true,
        email: "pending@example.com",
      }),
    });

    expect(await screen.findByText("access request route")).toBeInTheDocument();
  });

  it("redirects shared survey users to the admin survey list without admin approval", async () => {
    renderLogin({
      getAdminSessionState: async () => sharedSurveySession,
    });

    expect(await screen.findByText("survey route")).toBeInTheDocument();
  });
});
