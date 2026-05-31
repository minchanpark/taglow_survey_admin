import { Clock3, ShieldAlert, ShieldPlus } from "lucide-react";
import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import {
  useAdminSessionQuery,
  useAdminSignOutMutation,
  useRequestAdminAccessMutation,
} from "../../../api/admin/query";
import { systemSuperAdminEmail } from "../../../api/admin/model";
import { Button, LoadingState } from "../../../components";
import "./css/AdminSystemPages.css";

export function AdminAccessDeniedPage() {
  const navigate = useNavigate();
  const sessionQuery = useAdminSessionQuery();
  const requestAccessMutation = useRequestAdminAccessMutation();
  const signOutMutation = useAdminSignOutMutation();
  const [notice, setNotice] = useState<string | null>(null);

  if (sessionQuery.isPending) {
    return (
      <main className="tg-admin-system-page">
        <LoadingState label="관리자 권한을 확인하는 중" />
      </main>
    );
  }

  if (sessionQuery.data?.admin?.isActive || sessionQuery.data?.hasSurveyAccess) {
    return <Navigate to="/admin/surveys" replace />;
  }

  const pendingAdmin = sessionQuery.data?.pendingAdmin;
  const isAuthenticated = sessionQuery.data?.isAuthenticated ?? false;
  const email = sessionQuery.data?.email?.toLowerCase();
  const isSuperAdminSeedEmail = email === systemSuperAdminEmail;
  const title = pendingAdmin ? "관리자 승인 대기 중입니다." : "관리자 접근 권한이 없습니다.";
  const description = pendingAdmin
    ? "최고 관리자가 요청을 승인하면 관리자 페이지에 접속할 수 있습니다."
    : isSuperAdminSeedEmail
      ? "super-admin 계정은 Supabase에서 직접 등록해야 합니다."
    : isAuthenticated
      ? "현재 Google 계정은 아직 관리자 권한을 받지 않았습니다."
      : "Google 계정으로 로그인한 뒤 관리자 승인을 요청할 수 있습니다.";
  const requestErrorMessage = getRequestAccessErrorMessage(requestAccessMutation.error);

  return (
    <main className="tg-admin-system-page">
      <section className="tg-admin-system-page__panel" aria-labelledby="admin-access-title">
        <div className="tg-admin-system-page__icon" aria-hidden="true">
          {pendingAdmin ? <Clock3 size={20} /> : <ShieldAlert size={20} />}
        </div>
        <div className="tg-admin-system-page__copy">
          <p className="tg-admin-system-page__eyebrow">관리자 권한</p>
          <h1 id="admin-access-title">{title}</h1>
          <p>{description}</p>
          {sessionQuery.data?.email ? <span>{sessionQuery.data.email}</span> : null}
        </div>

        {isSuperAdminSeedEmail ? (
          <p className="tg-admin-system-page__notice" role="status">
            Supabase admin_members에 role super_admin, is_active true로 등록한 뒤 다시 로그인해주세요.
          </p>
        ) : null}

        {notice ? <p className="tg-admin-system-page__notice" role="status">{notice}</p> : null}

        <div className="tg-admin-system-page__actions">
          {isAuthenticated && !pendingAdmin && !isSuperAdminSeedEmail ? (
            <Button
              variant="primary"
              icon={<ShieldPlus size={15} aria-hidden="true" />}
              disabled={requestAccessMutation.isPending}
              onClick={() => void requestAccess()}
            >
              {requestAccessMutation.isPending ? "요청 중" : "관리자 승인 요청"}
            </Button>
          ) : null}
          <Button
            variant="secondary"
            disabled={signOutMutation.isPending}
            onClick={() => void returnToLogin(isAuthenticated)}
          >
            {isAuthenticated && signOutMutation.isPending
              ? "로그아웃 중"
              : isAuthenticated
                ? "로그인으로 돌아가기"
                : "Google 로그인"}
          </Button>
        </div>

        {requestAccessMutation.isError ? (
          <p className="tg-admin-system-page__error" role="alert">
            {requestErrorMessage}
          </p>
        ) : null}
        {signOutMutation.isError ? (
          <p className="tg-admin-system-page__error" role="alert">
            로그아웃 후 로그인 페이지로 이동하지 못했습니다. 다시 시도해주세요.
          </p>
        ) : null}
      </section>
    </main>
  );

  async function requestAccess() {
    setNotice(null);
    try {
      const member = await requestAccessMutation.mutateAsync();
      await sessionQuery.refetch();
      if (member.isActive) {
        navigate("/admin/surveys", { replace: true });
        return;
      }
      setNotice("승인 요청을 보냈습니다.");
    } catch {
      setNotice(null);
    }
  }

  async function returnToLogin(authenticated: boolean) {
    setNotice(null);
    if (!authenticated) {
      navigate("/admin/login", { replace: true });
      return;
    }
    try {
      await signOutMutation.mutateAsync();
      navigate("/admin/login", { replace: true });
    } catch {
      setNotice(null);
    }
  }
}

function getRequestAccessErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : "";
  if (/request_admin_access|function .*not.*found|schema cache/i.test(message)) {
    return "승인 요청 RPC가 아직 Supabase에 없습니다. 017 migration을 DB에 적용한 뒤 다시 시도해주세요.";
  }
  if (/Super-admin access must be registered directly in Supabase|itisnewdawn/i.test(message)) {
    return "super-admin 계정은 승인 요청 대상이 아닙니다. Supabase에서 직접 등록해주세요.";
  }
  if (/row-level security|permission denied|not authorized/i.test(message)) {
    return "승인 요청 권한 정책에서 거절되었습니다. Supabase RLS와 017 migration 적용 상태를 확인해주세요.";
  }
  return "승인 요청을 보내지 못했습니다. Supabase migration 적용 상태와 로그인 계정을 확인해주세요.";
}
