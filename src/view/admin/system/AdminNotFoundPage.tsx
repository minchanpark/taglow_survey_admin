import { Link } from "react-router-dom";
import { Button, EmptyState } from "../../../components";
import "./css/AdminSystemPages.css";

export function AdminNotFoundPage() {
  return (
    <main className="tg-admin-system-page">
      <EmptyState title="요청한 관리자 화면을 찾을 수 없습니다." description="설문 목록에서 다시 시작해주세요." />
      <Link to="/admin/surveys" className="tg-admin-system-page__link">
        <Button variant="primary">설문 목록</Button>
      </Link>
    </main>
  );
}
