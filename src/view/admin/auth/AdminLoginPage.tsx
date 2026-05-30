import { ShieldCheck } from "lucide-react";
import { Navigate } from "react-router-dom";
import { useAdminSessionQuery, useGoogleSignInMutation } from "../../../api/admin/query";
import { Button, ErrorState, LoadingState } from "../../../components";
import "./css/AdminLoginPage.css";

export function AdminLoginPage() {
  const sessionQuery = useAdminSessionQuery();
  const signInMutation = useGoogleSignInMutation();
  const redirectTo = new URL("/admin/login", window.location.origin).toString();

  if (sessionQuery.isPending) {
    return (
      <main className="tg-admin-login">
        <LoadingState label="세션을 확인하는 중" />
      </main>
    );
  }

  if (sessionQuery.data?.isAuthenticated && sessionQuery.data.admin?.isActive) {
    return <Navigate to="/admin/surveys" replace />;
  }

  if (sessionQuery.data?.isAuthenticated) {
    return <Navigate to="/admin/access-denied" replace />;
  }

  return (
    <main className="tg-admin-login">
      <section className="tg-admin-login__panel" aria-labelledby="admin-login-title">
        <div className="tg-admin-login__mark" aria-hidden="true">
          <ShieldCheck size={22} />
        </div>
        <div className="tg-admin-login__copy">
          <p className="tg-admin-login__eyebrow">Taglow Survey Admin</p>
          <h1 id="admin-login-title">관리자 로그인</h1>
          <p>Google 계정 로그인 후 등록된 관리자 권한을 확인합니다.</p>
        </div>
        <Button
          variant="primary"
          icon={<ShieldCheck size={16} aria-hidden="true" />}
          onClick={() => signInMutation.mutate({ redirectTo })}
          disabled={signInMutation.isPending}
        >
          Google로 로그인
        </Button>
        {signInMutation.isError ? (
          <ErrorState
            title="로그인을 시작하지 못했습니다."
            description="Google 로그인 설정과 네트워크 상태를 확인해주세요."
          />
        ) : null}
      </section>
    </main>
  );
}
