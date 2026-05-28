import { PencilLine, Plus, RefreshCcw } from "lucide-react";
import { Link } from "react-router-dom";
import { getSurveyPublicIdentifier } from "../../../api/admin/model";
import { useSurveysQuery } from "../../../api/admin/query";
import { Button, EmptyState, ErrorState, LoadingState, SurveyStatusBadge } from "../../../components";
import "./css/SurveyListPage.css";

export function SurveyListPage() {
  const surveysQuery = useSurveysQuery();

  return (
    <section className="tg-survey-list-page" aria-labelledby="survey-list-title">
      <header className="tg-survey-list-page__header">
        <div>
          <p className="tg-survey-list-page__eyebrow">관리자 대시보드</p>
          <h1 id="survey-list-title">설문 목록</h1>
        </div>
        <Link to="/admin/surveys/new">
          <Button variant="primary" icon={<Plus size={16} aria-hidden="true" />}>
            새 설문
          </Button>
        </Link>
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

      {surveysQuery.isSuccess && surveysQuery.data.length === 0 ? (
        <EmptyState title="아직 설문이 없습니다." description="새 설문을 만들면 섹션과 질문을 구성할 수 있습니다." />
      ) : null}

      {surveysQuery.isSuccess && surveysQuery.data.length > 0 ? (
        <div className="tg-survey-list-page__table" role="table" aria-label="설문 목록">
          <div className="tg-survey-list-page__row tg-survey-list-page__row--head" role="row">
            <span role="columnheader">설문</span>
            <span role="columnheader">상태</span>
            <span role="columnheader">공개 ID</span>
            <span role="columnheader">버전</span>
            <span role="columnheader">수정일</span>
            <span role="columnheader">작업</span>
          </div>
          {surveysQuery.data.map((survey) => (
            <div
              key={survey.id}
              className="tg-survey-list-page__row"
              role="row"
            >
              <span className="tg-survey-list-page__survey" role="cell">
                <Link to={`/admin/surveys/${survey.id}/dashboard`} className="tg-survey-list-page__survey-link">
                  <strong>{survey.title}</strong>
                  <small>{survey.description ?? "설명 없음"}</small>
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
                <Link
                  to={`/admin/surveys/${survey.id}/builder`}
                  className="tg-survey-list-page__edit-link"
                  aria-label={`${survey.title} 수정`}
                >
                  <PencilLine size={15} aria-hidden="true" />
                  <span>수정</span>
                </Link>
              </span>
            </div>
          ))}
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
