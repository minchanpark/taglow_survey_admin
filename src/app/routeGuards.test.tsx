import { screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { RequireAdminShell } from "./routeGuards";
import {
  activeAdminSession,
  createFakeAdminApiController,
  nonMemberSession,
  unauthenticatedSession,
} from "../test/fakeAdminApiController";
import { renderWithProviders } from "../test/renderWithProviders";

function renderGuard(session = activeAdminSession) {
  return renderWithProviders(
    <MemoryRouter initialEntries={["/admin/surveys"]}>
      <Routes>
        <Route path="/admin/login" element={<div>login route</div>} />
        <Route path="/admin/access-denied" element={<div>denied route</div>} />
        <Route path="/admin" element={<RequireAdminShell />}>
          <Route path="surveys" element={<div>survey route</div>} />
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

  it("redirects non-member handong users to access denied", async () => {
    renderGuard(nonMemberSession);

    expect(await screen.findByText("denied route")).toBeInTheDocument();
  });

  it("renders admin routes for active admin members", async () => {
    renderGuard(activeAdminSession);

    expect(await screen.findByText("survey route")).toBeInTheDocument();
    expect(screen.getByText("admin@handong.ac.kr")).toBeInTheDocument();
  });
});
