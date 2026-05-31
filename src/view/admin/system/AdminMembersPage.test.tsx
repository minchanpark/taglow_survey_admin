import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { AdminApiController } from "../../../api/admin/controller";
import {
  activeAdminSession,
  createFakeAdminApiController,
  fakeActiveAdminMember,
  fakePendingAdminMember,
} from "../../../test/fakeAdminApiController";
import { renderWithProviders } from "../../../test/renderWithProviders";
import { AdminMembersPage } from "./AdminMembersPage";

function renderMembers(overrides: Partial<AdminApiController> = {}) {
  return renderWithProviders(<AdminMembersPage />, {
    controller: createFakeAdminApiController({
      getAdminSessionState: async () => activeAdminSession,
      listPendingAdminMembers: async () => [fakePendingAdminMember],
      ...overrides,
    }),
  });
}

describe("AdminMembersPage", () => {
  it("approves pending admin requests as admin role", async () => {
    const user = userEvent.setup();
    const approveAdminMember = vi.fn<AdminApiController["approveAdminMember"]>(async (command) => ({
      ...fakePendingAdminMember,
      id: command.memberId,
      role: command.role,
      isActive: true,
    }));
    renderMembers({ approveAdminMember });

    expect(await screen.findByRole("table", { name: "관리자 승인 요청" })).toBeInTheDocument();
    expect(await screen.findByText("pending@example.com")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "승인" }));

    expect(approveAdminMember).toHaveBeenCalledWith({ memberId: "admin-member-pending", role: "admin" });
    expect(await screen.findByText("pending@example.com 계정을 관리자로 승인했습니다.")).toBeInTheDocument();
  });

  it("upgrades active admin members to super admin", async () => {
    const user = userEvent.setup();
    const updateAdminMemberRole = vi.fn<AdminApiController["updateAdminMemberRole"]>(async (command) => ({
      ...fakeActiveAdminMember,
      id: command.memberId,
      role: command.role,
    }));
    renderMembers({ updateAdminMemberRole });

    expect(await screen.findByRole("table", { name: "활성 관리자 권한" })).toBeInTheDocument();
    expect(await screen.findByText("member@example.com")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "최고 관리자로 변경" }));

    expect(updateAdminMemberRole).toHaveBeenCalledWith({
      memberId: "admin-member-active",
      role: "super_admin",
    });
    expect(await screen.findByText("member@example.com 계정을 최고 관리자로 변경했습니다.")).toBeInTheDocument();
  });

  it("deletes active admin member permissions after confirmation", async () => {
    const user = userEvent.setup();
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    const deleteAdminMember = vi.fn<AdminApiController["deleteAdminMember"]>(async () => undefined);
    renderMembers({ deleteAdminMember });

    expect(await screen.findByText("member@example.com")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "권한 삭제" }));

    expect(confirm).toHaveBeenCalledWith("member@example.com 계정의 관리자 권한을 삭제할까요?");
    expect(deleteAdminMember).toHaveBeenCalledWith({ memberId: "admin-member-active" });
    expect(await screen.findByText("member@example.com 계정의 관리자 권한을 삭제했습니다.")).toBeInTheDocument();

    confirm.mockRestore();
  });

  it("blocks non-super-admin members from handling requests", async () => {
    renderMembers({
      getAdminSessionState: async () => ({
        ...activeAdminSession,
        admin: activeAdminSession.admin ? { ...activeAdminSession.admin, role: "admin" } : undefined,
      }),
    });

    expect(await screen.findByText("최고 관리자만 접근할 수 있습니다.")).toBeInTheDocument();
  });
});
