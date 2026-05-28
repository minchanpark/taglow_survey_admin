import { Link } from "react-router-dom";
import { Button, ErrorState } from "../../../components";
import "./css/AdminSystemPages.css";

export function AdminAccessDeniedPage() {
  return (
    <main className="tg-admin-system-page">
      <ErrorState
        title="관리자 접근 권한이 없습니다."
        description="한동대학교 계정이 아니거나 active admin_members 권한이 없습니다."
      />
      <Link to="/admin/login" className="tg-admin-system-page__link">
        <Button variant="secondary">로그인으로 돌아가기</Button>
      </Link>
    </main>
  );
}
