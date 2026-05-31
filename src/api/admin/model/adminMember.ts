export type AdminRole = "super_admin" | "admin" | "viewer";
export type ApprovableAdminRole = "admin";
export type UpgradableAdminRole = "super_admin";

export const systemSuperAdminEmail = "itisnewdawn@gmail.com";

export type AdminMember = Readonly<{
  id: string;
  userId: string;
  email: string;
  role: AdminRole;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}>;

export function getAdminRoleLabel(role: AdminRole): string {
  if (role === "super_admin") return "최고 관리자";
  if (role === "admin") return "관리자";
  return "공유 사용자";
}

export function isAdminAccessRole(role: AdminRole): boolean {
  return role === "super_admin" || role === "admin";
}

export function isSuperAdminRole(role: AdminRole): boolean {
  return role === "super_admin";
}

export function isSystemSuperAdmin(member: Pick<AdminMember, "email" | "role">): boolean {
  return member.role === "super_admin" && member.email.toLowerCase() === systemSuperAdminEmail;
}

export function canUpgradeAdminMember(member: AdminMember): boolean {
  return member.isActive && member.role === "admin";
}

export function canDeleteAdminMember(member: AdminMember, currentAdmin?: AdminMember): boolean {
  return member.isActive && member.id !== currentAdmin?.id && !isSystemSuperAdmin(member);
}
