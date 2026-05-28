import { BarChart3 } from "lucide-react";
import { useParams } from "react-router-dom";
import { EmptyState } from "../../../components";
import "./css/SurveyAnalysisPage.css";

export function SurveyAnalysisPage() {
  const { surveyId } = useParams();

  return (
    <section className="tg-analysis-placeholder-page" aria-labelledby="survey-analysis-title">
      <header>
        <p>설문 ID {surveyId}</p>
        <h1 id="survey-analysis-title">분석 워크벤치</h1>
      </header>
      <EmptyState
        title="Global Filter Bar와 분석 카드는 Analysis phase에서 구현합니다."
        description="모든 분석 결과에는 응답 수 N과 필터 상태를 함께 표시합니다."
        icon={<BarChart3 size={18} aria-hidden="true" />}
      />
    </section>
  );
}
