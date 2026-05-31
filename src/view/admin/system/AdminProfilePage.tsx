import { CheckCircle2, Clock3, ShieldPlus, UserCircle } from "lucide-react";
import { useState } from "react";
import { Navigate } from "react-router-dom";
import { getAdminRoleLabel, systemSuperAdminEmail } from "../../../api/admin/model";
import { useAdminSessionQuery, useRequestAdminAccessMutation } from "../../../api/admin/query";
import { Button, LoadingState } from "../../../components";
import "./css/AdminSystemPages.css";

export function AdminProfilePage() {
  const sessionQuery = useAdminSessionQuery();
  const requestAccessMutation = useRequestAdminAccessMutation();
  const [notice, setNotice] = useState<string | null>(null);

  if (sessionQuery.isPending) {
    return (
      <section className="tg-admin-profile-page" aria-labelledby="admin-profile-title">
        <LoadingState label="계정 정보를 불러오는 중" />
      </section>
    );
  }

  const session = sessionQuery.data;
  if (!session?.isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  const email = session.email ?? session.admin?.email ?? "";
  const pendingAdmin = session.pendingAdmin;
  const hasAdminAccess = Boolean(session.admin?.isActive);
  const hasSharedAccess = Boolean(session.hasSurveyAccess && !hasAdminAccess);
  const isSuperAdminSeedEmail = email.toLowerCase() === systemSuperAdminEmail;

  return (
    <section className="tg-admin-profile-page" aria-labelledby="admin-profile-title">
      <header className="tg-admin-profile-page__header">
        <div>
          <p className="tg-admin-profile-page__eyebrow">내 계정</p>
          <h1 id="admin-profile-title">접근 권한</h1>
        </div>
      </header>

      <div className="tg-admin-profile-page__panel">
        <div className="tg-admin-profile-page__icon" aria-hidden="true">
          {pendingAdmin ? <Clock3 size={20} /> : hasAdminAccess ? <CheckCircle2 size={20} /> : <UserCircle size={20} />}
        </div>
        <div className="tg-admin-profile-page__copy">
          <h2>{getProfileTitle({ hasAdminAccess, hasSharedAccess, hasPendingRequest: Boolean(pendingAdmin) })}</h2>
          <p>{getProfileDescription({ hasAdminAccess, hasSharedAccess, hasPendingRequest: Boolean(pendingAdmin), isSuperAdminSeedEmail })}</p>
          <span>{email}</span>
        </div>

        <dl className="tg-admin-profile-page__status">
          <div>
            <dt>설문 접근</dt>
            <dd>{hasAdminAccess ? "전체 관리자 설문" : hasSharedAccess ? "공유받은 설문" : "없음"}</dd>
          </div>
          <div>
            <dt>설문 만들기</dt>
            <dd>{hasAdminAccess ? "가능" : "관리자 승인 필요"}</dd>
          </div>
          <div>
            <dt>관리자 상태</dt>
            <dd>{hasAdminAccess ? getAdminRoleLabel(session.admin?.role ?? "admin") : pendingAdmin ? "승인 대기" : "미요청"}</dd>
          </div>
        </dl>

        {notice ? <p className="tg-admin-profile-page__notice" role="status">{notice}</p> : null}
        {requestAccessMutation.isError ? (
          <p className="tg-admin-profile-page__error" role="alert">
            {getRequestAccessErrorMessage(requestAccessMutation.error)}
          </p>
        ) : null}

        {!hasAdminAccess && !pendingAdmin && !isSuperAdminSeedEmail ? (
          <div className="tg-admin-profile-page__actions">
            <Button
              variant="primary"
              icon={<ShieldPlus size={15} aria-hidden="true" />}
              disabled={requestAccessMutation.isPending}
              onClick={() => void requestAccess()}
            >
              {requestAccessMutation.isPending ? "요청 중" : "관리자 권한 요청"}
            </Button>
          </div>
        ) : null}
      </div>
    </section>
  );

  async function requestAccess() {
    setNotice(null);
    try {
      const member = await requestAccessMutation.mutateAsync();
      await sessionQuery.refetch();
      setNotice(member.isActive ? "관리자 권한이 활성화되었습니다." : "관리자 권한 요청을 보냈습니다.");
    } catch {
      setNotice(null);
    }
  }
}

function getProfileTitle(args: { hasAdminAccess: boolean; hasSharedAccess: boolean; hasPendingRequest: boolean }): string {
  if (args.hasAdminAccess) return "관리자 권한이 있습니다.";
  if (args.hasPendingRequest) return "관리자 승인 대기 중입니다.";
  if (args.hasSharedAccess) return "공유 설문을 이용 중입니다.";
  return "관리자 권한이 없습니다.";
}

function getProfileDescription(args: {
  hasAdminAccess: boolean;
  hasSharedAccess: boolean;
  hasPendingRequest: boolean;
  isSuperAdminSeedEmail: boolean;
}): string {
  if (args.hasAdminAccess) return "설문을 만들고, 본인이 만든 설문과 공유받은 설문을 함께 볼 수 있습니다.";
  if (args.hasPendingRequest) return "최고 관리자가 요청을 승인하면 설문 만들기와 관리자 기능을 사용할 수 있습니다.";
  if (args.isSuperAdminSeedEmail) return "최고 관리자 계정은 Supabase에서 직접 등록해야 합니다.";
  if (args.hasSharedAccess) return "공유받은 설문은 계속 사용할 수 있습니다. 새 설문을 만들려면 관리자 권한을 요청해주세요.";
  return "설문을 만들거나 관리자 화면을 사용하려면 관리자 권한을 요청해주세요.";
}

function getRequestAccessErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : "";
  if (/request_admin_access|function .*not.*found|schema cache/i.test(message)) {
    return "승인 요청 RPC가 아직 Supabase에 없습니다. 017 migration을 DB에 적용한 뒤 다시 시도해주세요.";
  }
  if (/Super-admin access must be registered directly in Supabase|itisnewdawn/i.test(message)) {
    return "최고 관리자 계정은 승인 요청 대상이 아닙니다. Supabase에서 직접 등록해주세요.";
  }
  if (/row-level security|permission denied|not authorized/i.test(message)) {
    return "승인 요청 권한 정책에서 거절되었습니다. Supabase RLS와 017 migration 적용 상태를 확인해주세요.";
  }
  return "승인 요청을 보내지 못했습니다. Supabase migration 적용 상태와 로그인 계정을 확인해주세요.";
}
