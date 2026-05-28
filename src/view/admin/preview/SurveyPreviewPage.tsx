import { Eye } from "lucide-react";
import { useParams } from "react-router-dom";
import { EmptyState } from "../../../components";
import "./css/SurveyPreviewPage.css";

export function SurveyPreviewPage() {
  const { surveyId } = useParams();

  return (
    <section className="tg-preview-placeholder-page" aria-labelledby="survey-preview-title">
      <header>
        <p>설문 ID {surveyId}</p>
        <h1 id="survey-preview-title">참여자 화면 미리보기</h1>
      </header>
      <EmptyState
        title="미리보기 렌더러는 Preview / Publish phase에서 구현합니다."
        description="미리보기 입력은 실제 responses 또는 answers를 만들지 않는 구조로 연결합니다."
        icon={<Eye size={18} aria-hidden="true" />}
      />
    </section>
  );
}
