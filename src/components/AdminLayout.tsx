import { BarChart3, Eye, FileText, LayoutDashboard, ListChecks, LogOut, Settings, UserCheck, UserCircle } from "lucide-react";
import type { ReactNode } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  canEditSurvey,
  canInviteSurvey,
  canManageSurvey,
  getAdminRoleLabel,
  type AdminRole,
  type SurveyAccessRole,
} from "../api/admin/model";
import { Button } from "./Button";
import "./css/AdminLayout.css";

type AdminLayoutProps = Readonly<{
  adminEmail: string;
  adminRole?: AdminRole;
  onSignOut: () => void;
  isSigningOut?: boolean;
  selectedSurveyAccessRole?: SurveyAccessRole;
  children?: ReactNode;
}>;

const primaryLinks = [
  { to: "/admin/surveys", label: "설문", icon: <ListChecks size={16} aria-hidden="true" /> },
  { to: "/admin/profile", label: "내 계정", icon: <UserCircle size={16} aria-hidden="true" /> },
];

const surveyLinks: ReadonlyArray<{
  segment: "dashboard" | "builder" | "preview" | "analysis" | "settings";
  label: string;
  icon: ReactNode;
}> = [
  { segment: "dashboard", label: "대시보드", icon: <LayoutDashboard size={16} aria-hidden="true" /> },
  { segment: "builder", label: "빌더", icon: <FileText size={16} aria-hidden="true" /> },
  { segment: "preview", label: "미리보기", icon: <Eye size={16} aria-hidden="true" /> },
  { segment: "analysis", label: "분석", icon: <BarChart3 size={16} aria-hidden="true" /> },
  { segment: "settings", label: "설정", icon: <Settings size={16} aria-hidden="true" /> },
];

export function AdminLayout({ adminEmail, adminRole, onSignOut, isSigningOut, selectedSurveyAccessRole, children }: AdminLayoutProps) {
  const location = useLocation();
  const selectedSurveyId = getSelectedSurveyId(location.pathname);
  const accountAccessLabel = getAccountAccessLabel(adminRole);
  const visiblePrimaryLinks =
    adminRole === "super_admin"
      ? [
          ...primaryLinks,
          { to: "/admin/admin-members", label: "권한", icon: <UserCheck size={16} aria-hidden="true" /> },
        ]
      : primaryLinks;

  return (
    <div className="tg-admin-layout">
      <aside className="tg-admin-layout__sidebar" aria-label="관리자 내비게이션">
        <div className="tg-admin-layout__brand">
          <span className="tg-admin-layout__brand-mark" aria-hidden="true">T</span>
          <div>
            <p className="tg-admin-layout__brand-name">Taglow</p>
            <p className="tg-admin-layout__brand-subtitle">Survey Admin</p>
          </div>
        </div>

        <nav className="tg-admin-layout__nav">
          {visiblePrimaryLinks.map((link) => (
            <NavLink key={link.to} to={link.to} className={({ isActive }) => navClassName(isActive)}>
              {link.icon}
              <span>{link.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="tg-admin-layout__nav-section">
          <p className="tg-admin-layout__nav-title">선택 설문</p>
          <div className="tg-admin-layout__muted-nav">
            {surveyLinks.map((link) =>
              shouldShowSurveyLink(link.segment, selectedSurveyAccessRole) && selectedSurveyId ? (
                <NavLink
                  key={link.segment}
                  to={`/admin/surveys/${selectedSurveyId}/${link.segment}`}
                  className={({ isActive }) => navClassName(isActive)}
                >
                  {link.icon}
                  <span>{link.label}</span>
                </NavLink>
              ) : shouldShowSurveyLink(link.segment, selectedSurveyAccessRole) ? (
                <span key={link.segment} className="tg-admin-layout__nav-link tg-admin-layout__nav-link--disabled">
                  {link.icon}
                  <span>{link.label}</span>
                </span>
              ) : null,
            )}
          </div>
        </div>

        <div className="tg-admin-layout__account">
          <div className="tg-admin-layout__account-copy">
            <p>{adminEmail}</p>
            <span>{accountAccessLabel}</span>
          </div>
          <Button
            aria-label="로그아웃"
            variant="ghost"
            icon={<LogOut size={16} aria-hidden="true" />}
            onClick={onSignOut}
            disabled={isSigningOut}
          />
        </div>
      </aside>
      <main className="tg-admin-layout__main">{children ?? <Outlet />}</main>
    </div>
  );
}

function navClassName(isActive: boolean): string {
  return ["tg-admin-layout__nav-link", isActive ? "tg-admin-layout__nav-link--active" : ""].filter(Boolean).join(" ");
}

function getSelectedSurveyId(pathname: string): string | undefined {
  const match = /^\/admin\/surveys\/([^/]+)(?:\/|$)/.exec(pathname);
  if (!match || match[1] === "new") return undefined;
  return decodeURIComponent(match[1]);
}

function shouldShowSurveyLink(segment: (typeof surveyLinks)[number]["segment"], accessRole: SurveyAccessRole | undefined): boolean {
  if (!accessRole) return true;
  if (segment === "builder") return canEditSurvey(accessRole);
  if (segment === "settings") return canManageSurvey(accessRole) || canInviteSurvey(accessRole);
  return true;
}

function getAccountAccessLabel(adminRole: AdminRole | undefined): string {
  if (adminRole) return getAdminRoleLabel(adminRole);
  return "공유 사용자";
}
