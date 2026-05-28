import { Settings } from "lucide-react";
import { useParams } from "react-router-dom";
import { EmptyState } from "../../../components";
import "./css/SurveySettingsPage.css";

export function SurveySettingsPage() {
  const { surveyId } = useParams();

  return (
    <section className="tg-settings-placeholder-page" aria-labelledby="survey-settings-title">
      <header>
        <p>설문 ID {surveyId}</p>
        <h1 id="survey-settings-title">설문 설정</h1>
      </header>
      <EmptyState
        title="설문 메타데이터와 게시 설정은 후속 phase에서 구현합니다."
        description="게시/종료/버전 잠금은 publish validation과 함께 연결합니다."
        icon={<Settings size={18} aria-hidden="true" />}
      />
    </section>
  );
}
