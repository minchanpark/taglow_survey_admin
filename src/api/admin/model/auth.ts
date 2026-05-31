import type { AdminMember } from "./adminMember";

export type AdminSignInCommand = Readonly<{
  redirectTo: string;
}>;

export type AdminSessionState = Readonly<{
  isAuthenticated: boolean;
  email?: string;
  admin?: AdminMember;
  pendingAdmin?: AdminMember;
  hasSurveyAccess?: boolean;
}>;
