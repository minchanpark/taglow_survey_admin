import { BarChart3, CalendarClock, Copy, Eye, LinkIcon, NotebookText, PencilLine, Settings, UsersRound } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  canEditSurvey,
  canInviteSurvey,
  canManageSurvey,
  getSurveyAccessRoleLabel,
  getSurveyPublicPath,
  type IdentityResponse,
  type Survey,
} from "../../../api/admin/model";
import { useIdentityResponsesInfiniteQuery, useResponseSummaryQuery, useSurveyDetailQuery } from "../../../api/admin/query";
import { Button, ErrorState, LoadingState, StatusBadge, SurveyStatusBadge } from "../../../components";
import { isReportDraftEnabled } from "../../../utils/featureFlags";
import "./css/SurveyDashboardPage.css";

const dashboardFilters = {};
const participantPublicBaseUrl = "https://taglow.newdawn.co.kr";

type Notice = Readonly<{
  tone: "success" | "error";
  message: string;
}>;

export function SurveyDashboardPage() {
  const { surveyId = "" } = useParams();
  const surveyQuery = useSurveyDetailQuery(surveyId);
  const responseSummaryQuery = useResponseSummaryQuery(surveyId, dashboardFilters, { enabled: surveyQuery.isSuccess });
  const identityResponsesQuery = useIdentityResponsesInfiniteQuery(surveyId, dashboardFilters, { enabled: surveyQuery.isSuccess });
  const [notice, setNotice] = useState<Notice | null>(null);
  const survey = surveyQuery.data?.survey;
  const publicPath = survey ? getSurveyPublicPath(survey) : undefined;
  const publicUrl = useMemo(() => {
    if (!publicPath) return undefined;
    return new URL(publicPath, participantPublicBaseUrl).toString();
  }, [publicPath]);
  const identityResponses = useMemo(
    () => identityResponsesQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [identityResponsesQuery.data],
  );

  if (surveyQuery.isPending) {
    return (
      <section className="tg-survey-dashboard-page" aria-labelledby="survey-dashboard-title">
        <LoadingState label="설문 대시보드를 불러오는 중" />
      </section>
    );
  }

  if (surveyQuery.isError || !surveyQuery.data || !survey) {
    return (
      <section className="tg-survey-dashboard-page" aria-labelledby="survey-dashboard-title">
        <ErrorState title="설문을 불러오지 못했습니다." description="설문 접근 권한 또는 설문 ID를 확인해주세요." />
      </section>
    );
  }

  const detail = surveyQuery.data;
  const responseSummary = responseSummaryQuery.data;
  const canOpenSettings = canManageSurvey(survey.accessRole) || canInviteSurvey(survey.accessRole);

  return (
    <section className="tg-survey-dashboard-page" aria-labelledby="survey-dashboard-title">
      <header className="tg-survey-dashboard-page__header">
        <div className="tg-survey-dashboard-page__title">
          <p className="tg-survey-dashboard-page__eyebrow">설문 대시보드</p>
          <h1 id="survey-dashboard-title">{survey.title.ko}</h1>
          <div className="tg-survey-dashboard-page__meta">
            <SurveyStatusBadge status={survey.status} />
            <span className={`tg-survey-dashboard-page__access tg-survey-dashboard-page__access--${survey.accessRole}`}>
              {getSurveyAccessRoleLabel(survey.accessRole)}
            </span>
            <span>v{survey.versionNumber}</span>
          </div>
        </div>
        <div className="tg-survey-dashboard-page__header-actions">
          {canEditSurvey(survey.accessRole) ? (
            <Link
              to={`/admin/surveys/${surveyId}/builder`}
              className="tg-survey-dashboard-page__action tg-survey-dashboard-page__action--primary"
            >
              <PencilLine size={15} aria-hidden="true" />
              <span>빌더에서 수정</span>
            </Link>
          ) : null}
          <Link to={`/admin/surveys/${surveyId}/preview`} className="tg-survey-dashboard-page__action">
            <Eye size={15} aria-hidden="true" />
            <span>미리보기</span>
          </Link>
          <Link to={`/admin/surveys/${surveyId}/analysis`} className="tg-survey-dashboard-page__action">
            <BarChart3 size={15} aria-hidden="true" />
            <span>분석 보기</span>
          </Link>
          {isReportDraftEnabled ? (
            <Link to={`/admin/surveys/${surveyId}/report`} className="tg-survey-dashboard-page__action">
              <NotebookText size={15} aria-hidden="true" />
              <span>보고서</span>
            </Link>
          ) : (
            <span
              className="tg-survey-dashboard-page__action tg-survey-dashboard-page__action--disabled"
              aria-disabled="true"
              title="개발 버전에서만 확인 가능합니다."
            >
              <NotebookText size={15} aria-hidden="true" />
              <span>보고서</span>
            </span>
          )}
          {canOpenSettings ? (
            <Link to={`/admin/surveys/${surveyId}/settings`} className="tg-survey-dashboard-page__action">
              <Settings size={15} aria-hidden="true" />
              <span>설정</span>
            </Link>
          ) : null}
        </div>
      </header>

      {notice ? (
        <div className={`tg-survey-dashboard-page__notice tg-survey-dashboard-page__notice--${notice.tone}`} role="status">
          {notice.message}
        </div>
      ) : null}

      <div className="tg-survey-dashboard-page__summary-grid" aria-label="설문 운영 요약">
        <MetricCard
          title="응답 수"
          value={formatCount(responseSummary?.submittedResponses)}
          helper={`전체 ${formatCount(responseSummary?.totalResponses)}명`}
          tone={responseSummary?.isLowSample ? "warning" : "default"}
        />
        <MetricCard title="섹션" value={String(detail.sections.length)} helper="설문 구조" />
        <MetricCard title="질문" value={String(detail.questions.length)} helper={`자산 ${detail.assets.length}개`} />
        <ScheduleCard survey={survey} />
      </div>

      <div className="tg-survey-dashboard-page__layout">
        <section className="tg-dashboard-panel" aria-labelledby="dashboard-public-url-title">
          <header className="tg-dashboard-panel__header">
            <div>
              <p>게시 링크</p>
              <h2 id="dashboard-public-url-title">참여자 공개 URL</h2>
            </div>
            <LinkIcon size={16} aria-hidden="true" />
          </header>
          <div className="tg-survey-dashboard-page__public-url">
            <strong>{publicUrl ?? "공개 식별자가 없습니다."}</strong>
            {publicUrl ? (
              <Button
                variant="secondary"
                icon={<Copy size={15} aria-hidden="true" />}
                onClick={() => {
                  void copyPublicUrl(publicUrl, setNotice);
                }}
              >
                복사
              </Button>
            ) : null}
          </div>
          <p className="tg-dashboard-panel__copy">
            공개 URL은 published 상태와 게시 예약 시간 조건을 통과한 설문만 참여자에게 열립니다.
          </p>
        </section>

        <RosterPanel
          responses={identityResponses}
          totalResponses={responseSummary?.submittedResponses}
          hasMore={Boolean(identityResponsesQuery.hasNextPage)}
          isLoading={identityResponsesQuery.isFetching && !identityResponses.length}
          isLoadingMore={identityResponsesQuery.isFetchingNextPage}
          onLoadMore={() => {
            void identityResponsesQuery.fetchNextPage();
          }}
        />
      </div>
    </section>
  );
}

function MetricCard(props: { title: string; value: string; helper: string; tone?: "default" | "warning" }) {
  return (
    <div className={`tg-survey-dashboard-page__metric tg-survey-dashboard-page__metric--${props.tone ?? "default"}`}>
      <span>{props.title}</span>
      <strong>{props.value}</strong>
      <small>{props.helper}</small>
      {props.tone === "warning" ? <StatusBadge tone="warning">해석 주의</StatusBadge> : null}
    </div>
  );
}

function ScheduleCard(props: { survey: Survey }) {
  return (
    <div className="tg-survey-dashboard-page__metric">
      <span>운영 시간</span>
      <strong>{formatScheduleRange(props.survey.startsAt, props.survey.endsAt)}</strong>
      <small>{props.survey.startsAt || props.survey.endsAt ? "예약 적용" : "수동 게시/종료"}</small>
      <CalendarClock size={15} aria-hidden="true" />
    </div>
  );
}

function RosterPanel(props: {
  responses: IdentityResponse[];
  totalResponses?: number;
  hasMore: boolean;
  isLoading: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
}) {
  const visibleResponses = props.responses.filter((response) => response.studentNumber || response.name);
  const totalResponseLabel = typeof props.totalResponses === "number" ? `전체 ${formatCount(props.totalResponses)}명` : "전체 집계 중";
  return (
    <section className="tg-dashboard-panel" aria-labelledby="dashboard-roster-title">
      <header className="tg-dashboard-panel__header">
        <div>
          <p>주의력 확인 통과 응답만</p>
          <h2 id="dashboard-roster-title">상세 명단</h2>
        </div>
        <UsersRound size={16} aria-hidden="true" />
      </header>
      <p className="tg-dashboard-panel__copy">{totalResponseLabel}</p>
      {props.isLoading ? <p className="tg-dashboard-panel__copy">상세 명단을 불러오는 중입니다.</p> : null}
      {visibleResponses.length ? (
        <div className="tg-dashboard-roster-table-wrap">
          <table className="tg-dashboard-roster-table">
            <thead>
              <tr>
                <th>학번</th>
                <th>이름</th>
                <th>기본 정보</th>
                <th>제출 시각</th>
              </tr>
            </thead>
            <tbody>
              {visibleResponses.map((response) => (
                <tr key={response.responseId}>
                  <td>{response.studentNumber ?? "-"}</td>
                  <td>{response.name ?? "-"}</td>
                  <td>{formatProfile(response.profile)}</td>
                  <td>{formatDateTime(response.submittedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : props.isLoading ? null : (
        <p className="tg-dashboard-panel__copy">이름과 학번 응답이 아직 없습니다.</p>
      )}
      {props.hasMore ? (
        <div className="tg-dashboard-panel__footer">
          <Button variant="secondary" onClick={props.onLoadMore} disabled={props.isLoadingMore}>
            {props.isLoadingMore ? "불러오는 중" : "더 보기"}
          </Button>
        </div>
      ) : null}
    </section>
  );
}

async function copyPublicUrl(url: string, setNotice: (notice: Notice) => void) {
  try {
    await navigator.clipboard.writeText(url);
    setNotice({ tone: "success", message: "공개 URL을 복사했습니다." });
  } catch {
    setNotice({ tone: "error", message: "브라우저에서 클립보드 복사를 허용하지 않았습니다." });
  }
}

function formatCount(value: number | undefined): string {
  return typeof value === "number" ? value.toLocaleString("ko-KR") : "-";
}

function formatProfile(profile: IdentityResponse["profile"]): string {
  const values = [profile?.dormitory, profile?.roomType, profile?.rc, profile?.department].filter((value): value is string => Boolean(value));
  return values.length ? values.join(" · ") : "-";
}

function formatDateTime(value: string | undefined): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatScheduleRange(startsAt: string | undefined, endsAt: string | undefined): string {
  if (!startsAt && !endsAt) return "설정 안 됨";
  if (startsAt && endsAt) return `${formatDateTime(startsAt)} -> ${formatDateTime(endsAt)}`;
  if (startsAt) return `${formatDateTime(startsAt)} 게시`;
  return `${formatDateTime(endsAt)} 종료`;
}
