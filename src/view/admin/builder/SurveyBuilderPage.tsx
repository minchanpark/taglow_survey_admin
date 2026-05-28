import { FileText } from "lucide-react";
import { useParams } from "react-router-dom";
import { EmptyState } from "../../../components";
import "./css/SurveyBuilderPage.css";

export function SurveyBuilderPage() {
  const { surveyId } = useParams();

  return (
    <section className="tg-admin-placeholder-page" aria-labelledby="survey-builder-title">
      <header>
        <p>설문 ID {surveyId}</p>
        <h1 id="survey-builder-title">설문 빌더</h1>
      </header>
      <EmptyState
        title="섹션과 질문 편집은 다음 Builder phase에서 구현합니다."
        description="현재 라우트는 권한 가드와 앱 셸 연결을 확인하기 위한 자리입니다."
        icon={<FileText size={18} aria-hidden="true" />}
      />
    </section>
  );
}
