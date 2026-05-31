import { Archive, BarChart3, PencilLine, Plus, RefreshCcw, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { canEditSurvey, canManageSurvey, getSurveyAccessRoleLabel, getSurveyPublicIdentifier, type Survey } from "../../../api/admin/model";
import { useAdminSessionQuery, useArchiveSurveyMutation, useDeleteSurveyMutation, useSurveysQuery } from "../../../api/admin/query";
import { Button, EmptyState, ErrorState, LoadingState, SurveyStatusBadge } from "../../../components";
import "./css/SurveyListPage.css";

type SurveyListView = "active" | "archived";

type Notice = Readonly<{
  tone: "success" | "error";
  message: string;
}>;

export function SurveyListPage() {
  const surveysQuery = useSurveysQuery();
  const sessionQuery = useAdminSessionQuery();
  const archiveSurveyMutation = useArchiveSurveyMutation();
  const deleteSurveyMutation = useDeleteSurveyMutation();
  const [listView, setListView] = useState<SurveyListView>("active");
  const [notice, setNotice] = useState<Notice | null>(null);

  const visibleSurveys = useMemo(() => {
    const surveys = surveysQuery.data ?? [];
    return surveys.filter((survey) => (listView === "archived" ? survey.status === "archived" : survey.status !== "archived"));
  }, [listView, surveysQuery.data]);

  const archivedSurveyCount = surveysQuery.data?.filter((survey) => survey.status === "archived").length ?? 0;

  const handleArchiveSurvey = async (survey: Survey) => {
    if (survey.status !== "closed") {
      return;
    }

    const confirmed = window.confirm(
      `"${survey.title}" 종료 설문을 보관할까요?\n보관된 설문은 보관함에서만 확인할 수 있습니다.`,
    );

    if (!confirmed) {
      return;
    }

    setNotice(null);
    try {
      await archiveSurveyMutation.mutateAsync(survey.id);
      setNotice({ tone: "success", message: "설문을 보관했습니다. 보관함에서 확인할 수 있습니다." });
    } catch {
      setNotice({ tone: "error", message: "설문을 보관하지 못했습니다. 종료 상태와 관리자 권한을 확인해주세요." });
    }
  };

  const handleDeleteSurvey = async (survey: Survey) => {
    if (!canDeleteSurvey(survey)) {
      return;
    }

    const confirmed = window.confirm(getDeleteConfirmMessage(survey));

    if (!confirmed) {
      return;
    }

    setNotice(null);
    try {
      await deleteSurveyMutation.mutateAsync(survey.id);
      setNotice({ tone: "success", message: "설문을 삭제했습니다." });
    } catch {
      setNotice({ tone: "error", message: "설문을 삭제하지 못했습니다. 상태와 관리자 권한을 확인한 뒤 다시 시도해주세요." });
    }
  };

  return (
    <section className="tg-survey-list-page" aria-labelledby="survey-list-title">
      <header className="tg-survey-list-page__header">
        <div>
          <p className="tg-survey-list-page__eyebrow">관리자 대시보드</p>
          <h1 id="survey-list-title">설문 목록</h1>
        </div>
        {sessionQuery.data?.admin ? (
          <Link to="/admin/surveys/new">
            <Button variant="primary" icon={<Plus size={16} aria-hidden="true" />}>
              새 설문
            </Button>
          </Link>
        ) : null}
      </header>

      {surveysQuery.isPending ? <LoadingState label="설문 목록을 불러오는 중" /> : null}

      {surveysQuery.isError ? (
        <ErrorState
          title="설문 목록을 불러오지 못했습니다."
          description="Supabase 연결과 관리자 권한을 확인한 뒤 다시 시도해주세요."
          actionLabel="다시 시도"
          onAction={() => void surveysQuery.refetch()}
          icon={<RefreshCcw size={18} aria-hidden="true" />}
        />
      ) : null}

      {notice ? (
        <p
          className={`tg-survey-list-page__feedback tg-survey-list-page__feedback--${notice.tone}`}
          role={notice.tone === "error" ? "alert" : "status"}
        >
          {notice.message}
        </p>
      ) : null}

      {surveysQuery.isSuccess && surveysQuery.data.length > 0 ? (
        <div className="tg-survey-list-page__toolbar" aria-label="설문 목록 보기">
          <button
            type="button"
            className={listView === "active" ? "is-active" : undefined}
            aria-pressed={listView === "active"}
            onClick={() => setListView("active")}
          >
            진행 목록
          </button>
          <button
            type="button"
            className={listView === "archived" ? "is-active" : undefined}
            aria-label={`보관함 ${archivedSurveyCount}개`}
            aria-pressed={listView === "archived"}
            onClick={() => setListView("archived")}
          >
            보관함
            <span>{archivedSurveyCount}</span>
          </button>
        </div>
      ) : null}

      {surveysQuery.isSuccess && surveysQuery.data.length === 0 ? (
        <EmptyState title="아직 설문이 없습니다." description="새 설문을 만들면 섹션과 질문을 구성할 수 있습니다." />
      ) : null}

      {surveysQuery.isSuccess && surveysQuery.data.length > 0 && visibleSurveys.length === 0 ? (
        <EmptyState
          title={listView === "archived" ? "보관된 설문이 없습니다." : "표시할 설문이 없습니다."}
          description={
            listView === "archived"
              ? "종료된 설문을 보관하면 이곳에서 따로 확인할 수 있습니다."
              : "보관된 설문은 보관함에서 확인할 수 있습니다."
          }
        />
      ) : null}

      {surveysQuery.isSuccess && visibleSurveys.length > 0 ? (
        <div className="tg-survey-list-page__table" role="table" aria-label="설문 목록">
          <div className="tg-survey-list-page__row tg-survey-list-page__row--head" role="row">
            <span role="columnheader">설문</span>
            <span role="columnheader">상태</span>
            <span role="columnheader">공개 ID</span>
            <span role="columnheader">버전</span>
            <span role="columnheader">수정일</span>
            <span role="columnheader">작업</span>
          </div>
          {visibleSurveys.map((survey) => {
            const isArchivePending = archiveSurveyMutation.isPending && archiveSurveyMutation.variables === survey.id;
            const isDeletePending = deleteSurveyMutation.isPending && deleteSurveyMutation.variables === survey.id;

            return (
              <div
                key={survey.id}
                className="tg-survey-list-page__row"
                role="row"
              >
                <span className="tg-survey-list-page__survey" role="cell">
                  <Link to={`/admin/surveys/${survey.id}/dashboard`} className="tg-survey-list-page__survey-link">
                    <strong>{survey.title}</strong>
                    <span className="tg-survey-list-page__survey-meta">
                      <small>{survey.description ?? "설명 없음"}</small>
                      <span className="tg-survey-list-page__access">
                        <span className={`tg-survey-list-page__access-badge tg-survey-list-page__access-badge--${survey.accessRole}`}>
                          {survey.accessRole === "owner" ? "내 설문" : "공유받음"}
                        </span>
                        <span className="tg-survey-list-page__access-badge">{getSurveyAccessRoleLabel(survey.accessRole)}</span>
                      </span>
                    </span>
                  </Link>
                </span>
                <span role="cell">
                  <SurveyStatusBadge status={survey.status} />
                </span>
                <span role="cell" className="tg-survey-list-page__public-id">
                  {getSurveyPublicIdentifier(survey) ?? "생성 전"}
                </span>
                <span role="cell">v{survey.versionNumber}</span>
                <span role="cell">{formatDate(survey.updatedAt)}</span>
                <span role="cell" className="tg-survey-list-page__actions">
                  {canEditSurvey(survey.accessRole) ? (
                    <Link
                      to={`/admin/surveys/${survey.id}/builder`}
                      className="tg-survey-list-page__edit-link"
                      aria-label={`${survey.title} 수정`}
                    >
                      <PencilLine size={15} aria-hidden="true" />
                      <span>수정</span>
                    </Link>
                  ) : (
                    <Link
                      to={`/admin/surveys/${survey.id}/analysis`}
                      className="tg-survey-list-page__edit-link"
                      aria-label={`${survey.title} 분석 보기`}
                    >
                      <BarChart3 size={15} aria-hidden="true" />
                      <span>분석</span>
                    </Link>
                  )}
                  {canManageSurvey(survey.accessRole) && survey.status === "closed" ? (
                    <Button
                      className="tg-survey-list-page__action-button"
                      variant="secondary"
                      icon={<Archive size={15} aria-hidden="true" />}
                      aria-label={`${survey.title} 보관`}
                      disabled={isArchivePending}
                      onClick={() => void handleArchiveSurvey(survey)}
                    >
                      {isArchivePending ? "보관 중" : "보관"}
                    </Button>
                  ) : null}
                  {canManageSurvey(survey.accessRole) ? (
                    <Button
                      className="tg-survey-list-page__action-button"
                      variant="danger"
                      icon={<Trash2 size={15} aria-hidden="true" />}
                      aria-label={`${survey.title} 삭제`}
                      disabled={!canDeleteSurvey(survey) || isDeletePending}
                      title={canDeleteSurvey(survey) ? undefined : "초안, 종료, 보관 상태의 설문만 삭제할 수 있습니다."}
                      onClick={() => void handleDeleteSurvey(survey)}
                    >
                      {isDeletePending ? "삭제 중" : "삭제"}
                    </Button>
                  ) : null}
                </span>
              </div>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

function canDeleteSurvey(survey: Survey): boolean {
  return survey.status === "draft" || survey.status === "closed" || survey.status === "archived";
}

function getDeleteConfirmMessage(survey: Survey): string {
  if (survey.status === "draft") {
    return `"${survey.title}" 초안 설문을 삭제할까요?\n삭제한 섹션/질문은 복구할 수 없습니다.`;
  }

  return `"${survey.title}" 설문을 영구 삭제할까요?\n설문 구조, 응답, 분석 데이터가 모두 삭제되며 복구할 수 없습니다.`;
}
