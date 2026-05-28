import { useParams } from "react-router-dom";
import { useSurveyDetailQuery } from "../../../api/admin/query";
import { EmptyState, ErrorState, LoadingState, SurveyStatusBadge } from "../../../components";
import "./css/SurveyDashboardPage.css";

export function SurveyDashboardPage() {
  const { surveyId = "" } = useParams();
  const surveyQuery = useSurveyDetailQuery(surveyId);

  return (
    <section className="tg-survey-dashboard-page" aria-labelledby="survey-dashboard-title">
      {surveyQuery.isPending ? <LoadingState label="설문 대시보드를 불러오는 중" /> : null}
      {surveyQuery.isError ? (
        <ErrorState title="설문을 불러오지 못했습니다." description="설문 접근 권한 또는 설문 ID를 확인해주세요." />
      ) : null}
      {surveyQuery.isSuccess ? (
        <>
          <header className="tg-survey-dashboard-page__header">
            <div>
              <p className="tg-survey-dashboard-page__eyebrow">설문 대시보드</p>
              <h1 id="survey-dashboard-title">{surveyQuery.data.survey.title}</h1>
            </div>
            <SurveyStatusBadge status={surveyQuery.data.survey.status} />
          </header>
          <div className="tg-survey-dashboard-page__grid">
            <Metric title="섹션" value={surveyQuery.data.sections.length} />
            <Metric title="질문" value={surveyQuery.data.questions.length} />
            <Metric title="자산" value={surveyQuery.data.assets.length} />
          </div>
          <EmptyState
            title="응답 요약과 개선 우선순위는 Analysis phase에서 채웁니다."
            description="현재 화면은 설문 상세 연결과 라우트 안정성을 확인하기 위한 최소 대시보드입니다."
          />
        </>
      ) : null}
    </section>
  );
}

function Metric(props: { title: string; value: number }) {
  return (
    <div className="tg-survey-dashboard-page__metric">
      <span>{props.title}</span>
      <strong>{props.value}</strong>
    </div>
  );
}
