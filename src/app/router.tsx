import { createBrowserRouter, Navigate, RouterProvider, useParams } from "react-router-dom";
import { isReportDraftEnabled } from "../utils/featureFlags";
import { AdminLoginPage } from "../view/admin/auth/AdminLoginPage";
import { SurveyAnalysisPage } from "../view/admin/analysis/SurveyAnalysisPage";
import { SurveyBuilderPage } from "../view/admin/builder/SurveyBuilderPage";
import { SurveyPreviewPage } from "../view/admin/preview/SurveyPreviewPage";
import { ReportDraftPage } from "../view/admin/report/ReportDraftPage";
import { SurveySettingsPage } from "../view/admin/settings/SurveySettingsPage";
import { AdminAccessDeniedPage } from "../view/admin/system/AdminAccessDeniedPage";
import { AdminMembersPage } from "../view/admin/system/AdminMembersPage";
import { AdminNotFoundPage } from "../view/admin/system/AdminNotFoundPage";
import { AdminProfilePage } from "../view/admin/system/AdminProfilePage";
import { NewSurveyPage } from "../view/admin/surveys/NewSurveyPage";
import { SurveyDashboardPage } from "../view/admin/surveys/SurveyDashboardPage";
import { SurveyListPage } from "../view/admin/surveys/SurveyListPage";
import { ParticipantSurveyPage } from "../view/participant/survey/ParticipantSurveyPage";
import { RequireAdminShell } from "./routeGuards";

const router = createBrowserRouter([
  { path: "/", element: <Navigate to="/admin/login" replace /> },
  { path: "/survey/:publicIdentifier", element: <ParticipantSurveyPage /> },
  { path: "/admin/login", element: <AdminLoginPage /> },
  { path: "/admin/access-denied", element: <AdminAccessDeniedPage /> },
  {
    path: "/admin",
    element: <RequireAdminShell />,
    children: [
      { index: true, element: <Navigate to="/admin/surveys" replace /> },
      { path: "surveys", element: <SurveyListPage /> },
      { path: "profile", element: <AdminProfilePage /> },
      { path: "admin-members", element: <AdminMembersPage /> },
      { path: "surveys/new", element: <NewSurveyPage /> },
      { path: "surveys/:surveyId/dashboard", element: <SurveyDashboardPage /> },
      { path: "surveys/:surveyId/builder", element: <SurveyBuilderPage /> },
      { path: "surveys/:surveyId/preview", element: <SurveyPreviewPage /> },
      { path: "surveys/:surveyId/analysis", element: <SurveyAnalysisPage /> },
      { path: "surveys/:surveyId/report", element: <ReportDraftRoute /> },
      { path: "surveys/:surveyId/settings", element: <SurveySettingsPage /> },
    ],
  },
  { path: "*", element: <AdminNotFoundPage /> },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}

function ReportDraftRoute() {
  const { surveyId = "" } = useParams();
  if (!isReportDraftEnabled) {
    return <Navigate to={`/admin/surveys/${encodeURIComponent(surveyId)}/analysis`} replace />;
  }
  return <ReportDraftPage />;
}
