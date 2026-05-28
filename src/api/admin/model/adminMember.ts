export type AdminRole = "owner" | "admin" | "viewer";

export type AdminMember = Readonly<{
  id: string;
  userId: string;
  email: string;
  role: AdminRole;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}>;
