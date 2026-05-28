import { FileText } from "lucide-react";
import { EmptyState } from "../../../components";
import "./css/SurveyPlaceholderPage.css";

export function NewSurveyPage() {
  return (
    <section className="tg-survey-placeholder-page" aria-labelledby="new-survey-title">
      <h1 id="new-survey-title">새 설문</h1>
      <EmptyState
        title="설문 생성 폼은 다음 Builder phase에서 구현합니다."
        description="이번 배치는 앱 셸, 권한 가드, 설문 목록 연결까지 완료합니다."
        icon={<FileText size={18} aria-hidden="true" />}
      />
    </section>
  );
}
