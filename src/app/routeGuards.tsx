import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAdminSessionQuery, useAdminSignOutMutation } from "../api/admin/query";
import { AdminLayout, ErrorState, LoadingState } from "../components";

export function RequireAdminShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const sessionQuery = useAdminSessionQuery();
  const signOutMutation = useAdminSignOutMutation();

  if (sessionQuery.isPending) {
    return <RouteStatus label="관리자 권한을 확인하는 중" />;
  }

  if (sessionQuery.isError) {
    return (
      <RouteStatus
        errorTitle="관리자 세션을 확인하지 못했습니다."
        errorDescription="네트워크 상태를 확인한 뒤 다시 시도해주세요."
        onRetry={() => void sessionQuery.refetch()}
      />
    );
  }

  const session = sessionQuery.data;
  if (!session.isAuthenticated) {
    return <Navigate to="/admin/login" replace state={{ from: location }} />;
  }

  if (!session.isHandongEmail || !session.admin?.isActive) {
    return <Navigate to="/admin/access-denied" replace />;
  }

  return (
    <AdminLayout
      adminEmail={session.admin.email}
      adminRole={session.admin.role}
      isSigningOut={signOutMutation.isPending}
      onSignOut={() => {
        signOutMutation.mutate(undefined, {
          onSuccess: () => navigate("/admin/login", { replace: true }),
        });
      }}
    >
      <Outlet />
    </AdminLayout>
  );
}

export function RouteStatus(props: {
  label?: string;
  errorTitle?: string;
  errorDescription?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="tg-route-status">
      {props.errorTitle ? (
        <ErrorState
          title={props.errorTitle}
          description={props.errorDescription}
          actionLabel={props.onRetry ? "다시 시도" : undefined}
          onAction={props.onRetry}
        />
      ) : (
        <LoadingState label={props.label} />
      )}
    </div>
  );
}
