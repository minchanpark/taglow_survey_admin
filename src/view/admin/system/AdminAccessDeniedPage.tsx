import { Link } from "react-router-dom";
import { Button, ErrorState } from "../../../components";
import "./css/AdminSystemPages.css";

export function AdminAccessDeniedPage() {
  return (
    <main className="tg-admin-system-page">
      <ErrorState
        title="관리자 접근 권한이 없습니다."
        description="현재 로그인한 Google 계정에 active admin_members 권한이 없습니다."
      />
      <Link to="/admin/login" className="tg-admin-system-page__link">
        <Button variant="secondary">로그인으로 돌아가기</Button>
      </Link>
    </main>
  );
}
