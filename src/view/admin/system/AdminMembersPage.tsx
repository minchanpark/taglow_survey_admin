import { RefreshCcw, ShieldCheck, ShieldPlus, Trash2, UserCheck } from "lucide-react";
import { useState } from "react";
import {
  canDeleteAdminMember,
  canUpgradeAdminMember,
  getAdminRoleLabel,
  type AdminMember,
} from "../../../api/admin/model";
import {
  useActiveAdminMembersQuery,
  useAdminSessionQuery,
  useApproveAdminMemberMutation,
  useDeleteAdminMemberMutation,
  usePendingAdminMembersQuery,
  useUpdateAdminMemberRoleMutation,
} from "../../../api/admin/query";
import { Button, EmptyState, ErrorState, LoadingState } from "../../../components";
import "./css/AdminSystemPages.css";

type Notice = Readonly<{
  tone: "success" | "error";
  message: string;
}>;

export function AdminMembersPage() {
  const sessionQuery = useAdminSessionQuery();
  const currentAdmin = sessionQuery.data?.admin;
  const isSuperAdmin = currentAdmin?.role === "super_admin";
  const pendingMembersQuery = usePendingAdminMembersQuery(isSuperAdmin);
  const activeMembersQuery = useActiveAdminMembersQuery(isSuperAdmin);
  const approveMutation = useApproveAdminMemberMutation();
  const updateRoleMutation = useUpdateAdminMemberRoleMutation();
  const deleteMutation = useDeleteAdminMemberMutation();
  const [notice, setNotice] = useState<Notice | null>(null);

  if (sessionQuery.isPending) {
    return (
      <section className="tg-admin-members-page" aria-labelledby="admin-members-title">
        <LoadingState label="관리자 권한을 확인하는 중" />
      </section>
    );
  }

  if (!isSuperAdmin) {
    return (
      <section className="tg-admin-members-page" aria-labelledby="admin-members-title">
        <ErrorState
          title="최고 관리자만 접근할 수 있습니다."
          description="관리자 승인 요청은 최고 관리자 계정에서만 처리할 수 있습니다."
        />
      </section>
    );
  }

  const pendingMembers = pendingMembersQuery.data ?? [];
  const activeMembers = activeMembersQuery.data ?? [];
  const isMemberActionPending = approveMutation.isPending || updateRoleMutation.isPending || deleteMutation.isPending;

  return (
    <section className="tg-admin-members-page" aria-labelledby="admin-members-title">
      <header className="tg-admin-members-page__header">
        <div>
          <p className="tg-admin-members-page__eyebrow">시스템 권한</p>
          <h1 id="admin-members-title">관리자 권한 관리</h1>
          <p>승인 요청과 활성 권한을 관리합니다. 설문 접근 범위는 본인 생성 설문으로 유지됩니다.</p>
        </div>
        <Button
          variant="secondary"
          icon={<RefreshCcw size={15} aria-hidden="true" />}
          disabled={pendingMembersQuery.isFetching || activeMembersQuery.isFetching}
          onClick={() => {
            void pendingMembersQuery.refetch();
            void activeMembersQuery.refetch();
          }}
        >
          새로고침
        </Button>
      </header>

      {notice ? (
        <p
          className={`tg-admin-members-page__notice tg-admin-members-page__notice--${notice.tone}`}
          role={notice.tone === "error" ? "alert" : "status"}
        >
          {notice.message}
        </p>
      ) : null}

      {pendingMembersQuery.isPending || activeMembersQuery.isPending ? (
        <LoadingState label="관리자 권한을 불러오는 중" />
      ) : null}

      {pendingMembersQuery.isError ? (
        <ErrorState
          title="승인 요청을 불러오지 못했습니다."
          description="최고 관리자 권한과 Supabase 정책을 확인한 뒤 다시 시도해주세요."
          actionLabel="다시 시도"
          onAction={() => void pendingMembersQuery.refetch()}
        />
      ) : null}

      {activeMembersQuery.isError ? (
        <ErrorState
          title="활성 권한을 불러오지 못했습니다."
          description="최고 관리자 권한과 Supabase 정책을 확인한 뒤 다시 시도해주세요."
          actionLabel="다시 시도"
          onAction={() => void activeMembersQuery.refetch()}
        />
      ) : null}

      {pendingMembersQuery.isSuccess ? (
        <section className="tg-admin-members-page__section" aria-labelledby="admin-members-pending-title">
          <div className="tg-admin-members-page__section-header">
            <h2 id="admin-members-pending-title">승인 요청</h2>
            <span>{pendingMembers.length}건</span>
          </div>

          {pendingMembers.length === 0 ? (
            <EmptyState
              title="대기 중인 요청이 없습니다."
              description="새 관리자가 승인 요청을 보내면 이곳에 표시됩니다."
              icon={<ShieldCheck size={18} aria-hidden="true" />}
            />
          ) : (
            <div className="tg-admin-members-page__table-shell">
              <table className="tg-admin-members-page__table" aria-label="관리자 승인 요청">
                <colgroup>
                  <col className="tg-admin-members-page__col-account" />
                  <col className="tg-admin-members-page__col-date" />
                  <col className="tg-admin-members-page__col-status" />
                  <col className="tg-admin-members-page__col-action--request" />
                </colgroup>
                <thead>
                  <tr>
                    <th scope="col">계정</th>
                    <th scope="col">요청일</th>
                    <th scope="col">상태</th>
                    <th scope="col" className="tg-admin-members-page__cell--actions">작업</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingMembers.map((member) => (
                    <tr key={member.id}>
                      <td className="tg-admin-members-page__email">{member.email}</td>
                      <td>{formatDate(member.createdAt)}</td>
                      <td className="tg-admin-members-page__status">승인 대기</td>
                      <td className="tg-admin-members-page__cell--actions">
                        <div className="tg-admin-members-page__actions">
                          <Button
                            variant="primary"
                            icon={<UserCheck size={15} aria-hidden="true" />}
                            disabled={isMemberActionPending}
                            onClick={() => void approveMember(member)}
                          >
                            승인
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : null}

      {activeMembersQuery.isSuccess ? (
        <section className="tg-admin-members-page__section" aria-labelledby="admin-members-active-title">
          <div className="tg-admin-members-page__section-header">
            <h2 id="admin-members-active-title">활성 권한</h2>
            <span>{activeMembers.length}명</span>
          </div>

          {activeMembers.length === 0 ? (
            <EmptyState
              title="활성 관리자 권한이 없습니다."
              description="승인된 관리자가 생기면 이곳에서 권한을 관리할 수 있습니다."
              icon={<ShieldCheck size={18} aria-hidden="true" />}
            />
          ) : (
            <div className="tg-admin-members-page__table-shell">
              <table className="tg-admin-members-page__table" aria-label="활성 관리자 권한">
                <colgroup>
                  <col className="tg-admin-members-page__col-account" />
                  <col className="tg-admin-members-page__col-role" />
                  <col className="tg-admin-members-page__col-date" />
                  <col className="tg-admin-members-page__col-action--member" />
                </colgroup>
                <thead>
                  <tr>
                    <th scope="col">계정</th>
                    <th scope="col">권한</th>
                    <th scope="col">등록일</th>
                    <th scope="col" className="tg-admin-members-page__cell--actions">작업</th>
                  </tr>
                </thead>
                <tbody>
                  {activeMembers.map((member) => {
                    const canUpgrade = canUpgradeAdminMember(member);
                    const canDelete = canDeleteAdminMember(member, currentAdmin);
                    return (
                      <tr key={member.id}>
                        <td className="tg-admin-members-page__email">{member.email}</td>
                        <td className="tg-admin-members-page__role">{getAdminRoleLabel(member.role)}</td>
                        <td>{formatDate(member.createdAt)}</td>
                        <td className="tg-admin-members-page__cell--actions">
                          <div className="tg-admin-members-page__actions">
                            {canUpgrade ? (
                              <Button
                                variant="secondary"
                                icon={<ShieldPlus size={15} aria-hidden="true" />}
                                disabled={isMemberActionPending}
                                onClick={() => void upgradeMember(member)}
                              >
                                최고 관리자로 변경
                              </Button>
                            ) : null}
                            {canDelete ? (
                              <Button
                                variant="danger"
                                icon={<Trash2 size={15} aria-hidden="true" />}
                                disabled={isMemberActionPending}
                                onClick={() => void deleteMember(member)}
                              >
                                권한 삭제
                              </Button>
                            ) : (
                              <span className="tg-admin-members-page__locked">보호됨</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : null}
    </section>
  );

  async function approveMember(member: AdminMember) {
    setNotice(null);
    try {
      await approveMutation.mutateAsync({ memberId: member.id, role: "admin" });
      setNotice({ tone: "success", message: `${member.email} 계정을 관리자로 승인했습니다.` });
    } catch {
      setNotice({ tone: "error", message: `${member.email} 계정을 승인하지 못했습니다.` });
    }
  }

  async function upgradeMember(member: AdminMember) {
    setNotice(null);
    try {
      await updateRoleMutation.mutateAsync({ memberId: member.id, role: "super_admin" });
      setNotice({ tone: "success", message: `${member.email} 계정을 최고 관리자로 변경했습니다.` });
    } catch {
      setNotice({ tone: "error", message: `${member.email} 계정 권한을 변경하지 못했습니다.` });
    }
  }

  async function deleteMember(member: AdminMember) {
    setNotice(null);
    const confirmed = window.confirm(`${member.email} 계정의 관리자 권한을 삭제할까요?`);
    if (!confirmed) return;

    try {
      await deleteMutation.mutateAsync({ memberId: member.id });
      setNotice({ tone: "success", message: `${member.email} 계정의 관리자 권한을 삭제했습니다.` });
    } catch {
      setNotice({ tone: "error", message: `${member.email} 계정의 관리자 권한을 삭제하지 못했습니다.` });
    }
  }
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}
