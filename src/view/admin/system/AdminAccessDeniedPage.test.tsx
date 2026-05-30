import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import type { AdminApiController } from "../../../api/admin/controller";
import {
  createFakeAdminApiController,
  fakePendingAdminMember,
  nonMemberSession,
  pendingAdminSession,
} from "../../../test/fakeAdminApiController";
import { renderWithProviders } from "../../../test/renderWithProviders";
import { AdminAccessDeniedPage } from "./AdminAccessDeniedPage";

function renderAccessDenied(overrides: Partial<AdminApiController> = {}) {
  return renderWithProviders(
    <MemoryRouter initialEntries={["/admin/access-denied"]}>
      <Routes>
        <Route path="/admin/access-denied" element={<AdminAccessDeniedPage />} />
        <Route path="/admin/login" element={<div>login route</div>} />
        <Route path="/admin/surveys" element={<div>survey route</div>} />
      </Routes>
    </MemoryRouter>,
    {
      controller: createFakeAdminApiController({
        getAdminSessionState: async () => nonMemberSession,
        ...overrides,
      }),
    },
  );
}

describe("AdminAccessDeniedPage", () => {
  it("lets authenticated non-members request admin approval", async () => {
    const user = userEvent.setup();
    const requestAdminAccess = vi.fn<AdminApiController["requestAdminAccess"]>(async () => fakePendingAdminMember);
    renderAccessDenied({ requestAdminAccess });

    await user.click(await screen.findByRole("button", { name: "관리자 승인 요청" }));

    expect(requestAdminAccess).toHaveBeenCalledTimes(1);
    expect(await screen.findByText("승인 요청을 보냈습니다.")).toBeInTheDocument();
  });

  it("shows pending request state without another request button", async () => {
    renderAccessDenied({ getAdminSessionState: async () => pendingAdminSession });

    expect(await screen.findByRole("heading", { name: "관리자 승인 대기 중입니다." })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "관리자 승인 요청" })).not.toBeInTheDocument();
  });

  it("does not request approval for the super-admin seed email", async () => {
    renderAccessDenied({
      getAdminSessionState: async () => ({
        isAuthenticated: true,
        email: "itisnewdawn@gmail.com",
      }),
    });

    expect(await screen.findByText("super-admin 계정은 Supabase에서 직접 등록해야 합니다.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "관리자 승인 요청" })).not.toBeInTheDocument();
  });

  it("explains when the approval RPC migration is missing", async () => {
    const user = userEvent.setup();
    const requestAdminAccess = vi.fn<AdminApiController["requestAdminAccess"]>(async () => {
      throw new Error("Could not find the function public.request_admin_access in the schema cache");
    });
    renderAccessDenied({ requestAdminAccess });

    await user.click(await screen.findByRole("button", { name: "관리자 승인 요청" }));

    expect(await screen.findByText("승인 요청 RPC가 아직 Supabase에 없습니다. 017 migration을 DB에 적용한 뒤 다시 시도해주세요.")).toBeInTheDocument();
  });

  it("signs out authenticated users before returning to login", async () => {
    const user = userEvent.setup();
    const signOut = vi.fn<AdminApiController["signOut"]>(async () => undefined);
    renderAccessDenied({ signOut });

    await user.click(await screen.findByRole("button", { name: "로그인으로 돌아가기" }));

    expect(signOut).toHaveBeenCalledTimes(1);
    expect(await screen.findByText("login route")).toBeInTheDocument();
  });
});
