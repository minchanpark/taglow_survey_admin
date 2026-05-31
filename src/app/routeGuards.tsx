import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAdminSessionQuery, useAdminSignOutMutation, useSurveyDetailQuery } from "../api/admin/query";
import { AdminLayout, ErrorState, LoadingState } from "../components";

export function RequireAdminShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const sessionQuery = useAdminSessionQuery();
  const signOutMutation = useAdminSignOutMutation();
  const selectedSurveyId = getSelectedSurveyId(location.pathname);
  const canEnterShell = Boolean(sessionQuery.data?.admin?.isActive || sessionQuery.data?.hasSurveyAccess);
  const selectedSurveyQuery = useSurveyDetailQuery(selectedSurveyId ?? "", Boolean(selectedSurveyId) && canEnterShell);

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

  if (!session.admin?.isActive && !session.hasSurveyAccess) {
    return <Navigate to="/admin/access-denied" replace />;
  }

  if (selectedSurveyId && selectedSurveyQuery.isPending) {
    return <RouteStatus label="설문 권한을 확인하는 중" />;
  }

  if (selectedSurveyId && selectedSurveyQuery.isError) {
    return (
      <RouteStatus
        errorTitle="설문 권한을 확인하지 못했습니다."
        errorDescription="이 설문에 접근할 수 있는지 확인한 뒤 다시 시도해주세요."
        onRetry={() => void selectedSurveyQuery.refetch()}
      />
    );
  }

  return (
    <AdminLayout
      adminEmail={session.admin?.email ?? session.email ?? ""}
      adminRole={session.admin?.role ?? "viewer"}
      selectedSurveyAccessRole={selectedSurveyQuery.data?.survey.accessRole}
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

function getSelectedSurveyId(pathname: string): string | undefined {
  const match = /^\/admin\/surveys\/([^/]+)(?:\/|$)/.exec(pathname);
  if (!match || match[1] === "new") return undefined;
  return decodeURIComponent(match[1]);
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
