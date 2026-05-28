import type { AdminMember } from "./adminMember";

export type AdminSignInCommand = Readonly<{
  redirectTo: string;
}>;

export type AdminSessionState = Readonly<{
  isAuthenticated: boolean;
  email?: string;
  isHandongEmail: boolean;
  admin?: AdminMember;
}>;
