import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import type { AdminApiController } from "../../../api/admin/controller";
import {
  activeAdminSession,
  createFakeAdminApiController,
  fakePendingAdminMember,
  pendingAdminSession,
  sharedSurveySession,
  unauthenticatedSession,
} from "../../../test/fakeAdminApiController";
import { renderWithProviders } from "../../../test/renderWithProviders";
import { AdminProfilePage } from "./AdminProfilePage";

function renderProfile(overrides: Partial<AdminApiController> = {}) {
  return renderWithProviders(
    <MemoryRouter initialEntries={["/admin/profile"]}>
      <Routes>
        <Route path="/admin/login" element={<div>login route</div>} />
        <Route path="/admin/profile" element={<AdminProfilePage />} />
      </Routes>
    </MemoryRouter>,
    {
      controller: createFakeAdminApiController({
        getAdminSessionState: async () => sharedSurveySession,
        ...overrides,
      }),
    },
  );
}

describe("AdminProfilePage", () => {
  it("lets shared survey users request admin access from the profile page", async () => {
    const user = userEvent.setup();
    const requestAdminAccess = vi.fn<AdminApiController["requestAdminAccess"]>(async () => fakePendingAdminMember);
    renderProfile({ requestAdminAccess });

    expect(await screen.findByRole("heading", { name: "공유 설문을 이용 중입니다." })).toBeInTheDocument();
    expect(screen.getByText("공유받은 설문")).toBeInTheDocument();
    expect(screen.getByText("관리자 승인 필요")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "관리자 권한 요청" }));

    expect(requestAdminAccess).toHaveBeenCalledTimes(1);
    expect(await screen.findByText("관리자 권한 요청을 보냈습니다.")).toBeInTheDocument();
  });

  it("shows pending admin request state without another request button", async () => {
    renderProfile({ getAdminSessionState: async () => pendingAdminSession });

    expect(await screen.findByRole("heading", { name: "관리자 승인 대기 중입니다." })).toBeInTheDocument();
    expect(screen.getByText("승인 대기")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "관리자 권한 요청" })).not.toBeInTheDocument();
  });

  it("shows active admin access state", async () => {
    renderProfile({ getAdminSessionState: async () => activeAdminSession });

    expect(await screen.findByRole("heading", { name: "관리자 권한이 있습니다." })).toBeInTheDocument();
    expect(screen.getByText("전체 관리자 설문")).toBeInTheDocument();
    expect(screen.getByText("가능")).toBeInTheDocument();
  });

  it("redirects unauthenticated users to login", async () => {
    renderProfile({ getAdminSessionState: async () => unauthenticatedSession });

    expect(await screen.findByText("login route")).toBeInTheDocument();
  });
});
