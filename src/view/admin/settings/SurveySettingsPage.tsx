import { CheckCircle2, Copy, ExternalLink, Globe2, RefreshCcw, Rocket, Save, UserPlus, Users, XCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { canInviteSurvey, canManageSurvey, getSurveyPublicPath, type SurveyCollaboratorRole } from "../../../api/admin/model";
import {
  useCloseSurveyMutation,
  useCreateNextVersionMutation,
  useInviteSurveyCollaboratorMutation,
  usePublishSurveyMutation,
  usePublishValidationQuery,
  useRevokeSurveyCollaboratorMutation,
  useSurveyDetailQuery,
  useSurveyCollaboratorsQuery,
  useUpdateSurveyCollaboratorRoleMutation,
  useUpdateSurveyMutation,
} from "../../../api/admin/query";
import { Button, ErrorState, LoadingState, SurveyStatusBadge } from "../../../components";
import "./css/SurveySettingsPage.css";

const participantPublicBaseUrl = "https://taglow.newdawn.co.kr";

type Notice = Readonly<{
  tone: "success" | "error";
  message: string;
}>;

const collaboratorRoleOptions: ReadonlyArray<Readonly<{ value: SurveyCollaboratorRole; label: string }>> = [
  { value: "viewer", label: "결과보기" },
  { value: "editor", label: "작업 가능" },
  { value: "manager", label: "초대 가능" },
];

export function SurveySettingsPage() {
  const { surveyId = "" } = useParams();
  const surveyQuery = useSurveyDetailQuery(surveyId);
  const validationQuery = usePublishValidationQuery(surveyId);
  const updateSurveyMutation = useUpdateSurveyMutation();
  const publishSurveyMutation = usePublishSurveyMutation();
  const closeSurveyMutation = useCloseSurveyMutation();
  const createNextVersionMutation = useCreateNextVersionMutation();
  const inviteCollaboratorMutation = useInviteSurveyCollaboratorMutation();
  const updateCollaboratorRoleMutation = useUpdateSurveyCollaboratorRoleMutation();
  const revokeCollaboratorMutation = useRevokeSurveyCollaboratorMutation();
  const [publicSlugInput, setPublicSlugInput] = useState("");
  const [collaboratorEmailInput, setCollaboratorEmailInput] = useState("");
  const [collaboratorRoleInput, setCollaboratorRoleInput] = useState<SurveyCollaboratorRole>("viewer");
  const [notice, setNotice] = useState<Notice | null>(null);
  const survey = surveyQuery.data?.survey;
  const collaboratorsQuery = useSurveyCollaboratorsQuery(surveyId, survey ? canInviteSurvey(survey.accessRole) : false);
  const publicPath = survey ? getSurveyPublicPath(survey) : undefined;
  const publicUrl = useMemo(() => {
    if (!publicPath) return undefined;
    return new URL(publicPath, participantPublicBaseUrl).toString();
  }, [publicPath]);
  const dashboardUrl = useMemo(() => {
    if (!surveyId) return undefined;
    return new URL(`/admin/surveys/${surveyId}/dashboard`, window.location.origin).toString();
  }, [surveyId]);

  useEffect(() => {
    if (survey) {
      setPublicSlugInput(survey.publicSlug ?? "");
    }
  }, [survey]);

  if (surveyQuery.isPending) {
    return (
      <section className="tg-settings-page" aria-labelledby="survey-settings-title">
        <LoadingState label="설문 설정을 불러오는 중" />
      </section>
    );
  }

  if (surveyQuery.isError || !survey) {
    return (
      <section className="tg-settings-page" aria-labelledby="survey-settings-title">
        <ErrorState title="설문 설정을 불러오지 못했습니다." description="설문 ID 또는 관리자 권한을 확인해주세요." />
      </section>
    );
  }

  const activeSurvey = survey;
  const canManageSettings = canManageSurvey(activeSurvey.accessRole) || canInviteSurvey(activeSurvey.accessRole);
  const canManageSharing = canManageSettings;
  const canOpenSettings = canManageSettings || canManageSharing;
  const normalizedSlug = normalizePublicSlug(publicSlugInput);
  const hasSlugChange = normalizedSlug !== (activeSurvey.publicSlug ?? "");
  const validationIssues = validationQuery.data?.issues ?? [];
  const canPublish = validationQuery.data?.canPublish ?? false;

  return (
    <section className="tg-settings-page" aria-labelledby="survey-settings-title">
      <header className="tg-settings-page__header">
        <div>
          <p className="tg-settings-page__eyebrow">설문 설정</p>
          <h1 id="survey-settings-title">{activeSurvey.title}</h1>
        </div>
        <SurveyStatusBadge status={activeSurvey.status} />
      </header>

      {notice ? (
        <div className={`tg-settings-page__notice tg-settings-page__notice--${notice.tone}`} role="status">
          {notice.tone === "success" ? <CheckCircle2 size={15} aria-hidden="true" /> : <XCircle size={15} aria-hidden="true" />}
          <span>{notice.message}</span>
        </div>
      ) : null}

      {!canOpenSettings ? (
        <ErrorState title="설문 설정을 변경할 수 없습니다." description="초대 가능 권한 이상만 공개 URL, 게시 상태, 공유 권한을 변경할 수 있습니다." />
      ) : null}

      {canOpenSettings ? (
      <div className="tg-settings-page__grid">
        {canManageSettings ? (
        <section className="tg-settings-panel" aria-labelledby="public-url-title">
          <header className="tg-settings-panel__header">
            <Globe2 size={18} aria-hidden="true" />
            <div>
              <h2 id="public-url-title">참여자 공개 URL</h2>
              <p>내부 UUID 대신 `public_slug` 또는 랜덤 `public_code`로 설문을 엽니다.</p>
            </div>
          </header>

          <div className="tg-settings-page__field">
            <label htmlFor="public-slug">Public slug</label>
            <div className="tg-settings-page__input-row">
              <input
                id="public-slug"
                value={publicSlugInput}
                onChange={(event) => setPublicSlugInput(event.target.value)}
                placeholder="handong-dorm-2026"
                spellCheck={false}
              />
              <Button
                variant="primary"
                icon={<Save size={15} aria-hidden="true" />}
                disabled={!hasSlugChange || updateSurveyMutation.isPending}
                onClick={() => void savePublicSlug()}
              >
                저장
              </Button>
            </div>
            <p>비워두면 자동 생성된 public code `{activeSurvey.publicCode ?? "생성 전"}`를 사용합니다.</p>
          </div>

          <div className="tg-settings-page__url-box">
            <span>공개 URL</span>
            <strong>{publicUrl ?? "공개 식별자가 없습니다."}</strong>
            {publicUrl && publicPath ? (
              <div className="tg-settings-page__url-actions">
                <Button variant="secondary" icon={<Copy size={15} aria-hidden="true" />} onClick={() => void copyPublicUrl(publicUrl)}>
                  복사
                </Button>
                <a href={publicUrl} target="_blank" rel="noreferrer" className="tg-settings-page__link-button">
                  <ExternalLink size={15} aria-hidden="true" />
                  <span>열기</span>
                </a>
              </div>
            ) : null}
          </div>
        </section>
        ) : null}

        {canManageSettings ? (
        <section className="tg-settings-panel" aria-labelledby="publish-title">
          <header className="tg-settings-panel__header">
            <Rocket size={18} aria-hidden="true" />
            <div>
              <h2 id="publish-title">게시 상태</h2>
              <p>게시된 설문만 `/survey/:publicIdentifier`에서 조회됩니다.</p>
            </div>
          </header>

          <div className="tg-settings-page__status-list">
            <StatusRow label="섹션" value={`${surveyQuery.data.sections.length}개`} />
            <StatusRow label="질문" value={`${surveyQuery.data.questions.length}개`} />
            <StatusRow label="게시 검증" value={validationQuery.isPending ? "확인 중" : canPublish ? "통과" : `${validationIssues.length}개 이슈`} />
          </div>

          {validationIssues.length ? (
            <ul className="tg-settings-page__issues" aria-label="게시 전 검증 이슈">
              {validationIssues.map((issue) => (
                <li key={issue.code}>{issue.message}</li>
              ))}
            </ul>
          ) : null}

          <div className="tg-settings-page__actions">
            <Button
              variant="primary"
              icon={<Rocket size={15} aria-hidden="true" />}
              disabled={!canPublish || publishSurveyMutation.isPending || activeSurvey.status === "published"}
              onClick={() => void publishSurvey()}
            >
              게시
            </Button>
            <Button
              variant="secondary"
              disabled={activeSurvey.status !== "published" || closeSurveyMutation.isPending}
              onClick={() => void closeSurvey()}
            >
              종료
            </Button>
            <Button
              variant="ghost"
              icon={<RefreshCcw size={15} aria-hidden="true" />}
              disabled={createNextVersionMutation.isPending}
              onClick={() => void createNextVersion()}
            >
              다음 버전
            </Button>
          </div>
        </section>
        ) : null}

        {canManageSharing ? (
        <section className="tg-settings-panel tg-settings-panel--wide" aria-labelledby="share-title">
          <header className="tg-settings-panel__header">
            <Users size={18} aria-hidden="true" />
            <div>
              <h2 id="share-title">공유</h2>
              <p>이메일을 등록한 뒤 설문 링크를 전달합니다. 메일은 자동 발송하지 않습니다.</p>
            </div>
          </header>

          <div className="tg-settings-page__field">
            <label htmlFor="collaborator-email">공유할 이메일</label>
            <div className="tg-settings-page__share-row">
              <input
                id="collaborator-email"
                type="email"
                value={collaboratorEmailInput}
                onChange={(event) => setCollaboratorEmailInput(event.target.value)}
                placeholder="member@example.com"
              />
              <select
                aria-label="공유 역할"
                value={collaboratorRoleInput}
                onChange={(event) => setCollaboratorRoleInput(event.target.value as SurveyCollaboratorRole)}
              >
                {collaboratorRoleOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <Button
                variant="primary"
                icon={<UserPlus size={15} aria-hidden="true" />}
                disabled={inviteCollaboratorMutation.isPending}
                onClick={() => void inviteCollaborator()}
              >
                등록
              </Button>
            </div>
            <p>결과보기는 결과 보기만 가능합니다. 작업 가능은 결과보기와 작업이 가능하고 초대는 할 수 없습니다. 초대 가능은 모두 가능합니다.</p>
          </div>

          <div className="tg-settings-page__url-box">
            <span>공유할 설문 링크</span>
            <strong>{dashboardUrl}</strong>
            {dashboardUrl ? (
              <div className="tg-settings-page__url-actions">
                <Button variant="secondary" icon={<Copy size={15} aria-hidden="true" />} onClick={() => void copyPublicUrl(dashboardUrl)}>
                  복사
                </Button>
              </div>
            ) : null}
          </div>

          <div className="tg-settings-page__collaborators" aria-label="공유된 사용자">
            {collaboratorsQuery.isPending ? <LoadingState label="공유 사용자를 불러오는 중" /> : null}
            {collaboratorsQuery.isError ? <p className="tg-settings-page__empty-copy">공유 사용자를 불러오지 못했습니다.</p> : null}
            {collaboratorsQuery.isSuccess && collaboratorsQuery.data.length === 0 ? (
              <p className="tg-settings-page__empty-copy">아직 공유된 사용자가 없습니다.</p>
            ) : null}
            {collaboratorsQuery.data?.map((collaborator) => (
              <div className="tg-settings-page__collaborator-row" key={collaborator.id}>
                <span>{collaborator.email}</span>
                <select
                  aria-label={`${collaborator.email} 역할`}
                  value={collaborator.role}
                  disabled={updateCollaboratorRoleMutation.isPending || revokeCollaboratorMutation.isPending}
                  onChange={(event) =>
                    void updateCollaboratorRoleMutation.mutateAsync({
                      collaboratorId: collaborator.id,
                      surveyId: activeSurvey.id,
                      role: event.target.value as SurveyCollaboratorRole,
                    })
                  }
                >
                  {collaboratorRoleOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <Button
                  variant="ghost"
                  disabled={revokeCollaboratorMutation.isPending}
                  onClick={() =>
                    void revokeCollaboratorMutation.mutateAsync({
                      collaboratorId: collaborator.id,
                      surveyId: activeSurvey.id,
                    })
                  }
                >
                  해제
                </Button>
              </div>
            ))}
          </div>
        </section>
        ) : null}
      </div>
      ) : null}
    </section>
  );

  async function savePublicSlug() {
    setNotice(null);
    if (!canManageSettings) {
      setNotice({ tone: "error", message: "공개 URL은 초대 가능 권한 이상만 변경할 수 있습니다." });
      return;
    }

    if (normalizedSlug && !isValidPublicSlug(normalizedSlug)) {
      setNotice({ tone: "error", message: "Public slug는 영문 소문자, 숫자, 하이픈만 사용할 수 있습니다." });
      return;
    }

    try {
      await updateSurveyMutation.mutateAsync({
        surveyId: activeSurvey.id,
        publicSlug: normalizedSlug,
      });
      setNotice({ tone: "success", message: normalizedSlug ? "공개 slug를 저장했습니다." : "공개 slug를 비웠습니다. public code를 사용합니다." });
    } catch {
      setNotice({ tone: "error", message: "공개 slug를 저장하지 못했습니다. 중복 여부와 권한을 확인해주세요." });
    }
  }

  async function copyPublicUrl(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setNotice({ tone: "success", message: "공개 URL을 복사했습니다." });
    } catch {
      setNotice({ tone: "error", message: "브라우저에서 클립보드 복사를 허용하지 않았습니다." });
    }
  }

  async function inviteCollaborator() {
    setNotice(null);
    if (!canManageSharing) {
      setNotice({ tone: "error", message: "초대 가능 권한 이상만 공유 사용자를 등록할 수 있습니다." });
      return;
    }

    const email = collaboratorEmailInput.trim().toLowerCase();
    if (!isValidEmail(email)) {
      setNotice({ tone: "error", message: "공유할 이메일을 정확히 입력해주세요." });
      return;
    }

    try {
      await inviteCollaboratorMutation.mutateAsync({
        surveyId: activeSurvey.id,
        email,
        role: collaboratorRoleInput,
      });
      setCollaboratorEmailInput("");
      setNotice({ tone: "success", message: "공유 사용자를 등록했습니다. 설문 링크를 전달해주세요." });
    } catch {
      setNotice({ tone: "error", message: "공유 사용자를 등록하지 못했습니다. 이미 등록된 이메일인지 확인해주세요." });
    }
  }

  async function publishSurvey() {
    setNotice(null);
    if (!canManageSettings) {
      setNotice({ tone: "error", message: "게시 상태는 초대 가능 권한 이상만 변경할 수 있습니다." });
      return;
    }

    try {
      await publishSurveyMutation.mutateAsync(activeSurvey.id);
      setNotice({ tone: "success", message: "설문을 게시했습니다." });
    } catch {
      setNotice({ tone: "error", message: "설문을 게시하지 못했습니다. 검증 이슈를 확인해주세요." });
    }
  }

  async function closeSurvey() {
    setNotice(null);
    if (!canManageSettings) {
      setNotice({ tone: "error", message: "게시 상태는 초대 가능 권한 이상만 변경할 수 있습니다." });
      return;
    }

    try {
      await closeSurveyMutation.mutateAsync(activeSurvey.id);
      setNotice({ tone: "success", message: "설문을 종료했습니다." });
    } catch {
      setNotice({ tone: "error", message: "설문을 종료하지 못했습니다." });
    }
  }

  async function createNextVersion() {
    setNotice(null);
    if (!canManageSettings) {
      setNotice({ tone: "error", message: "다음 버전은 초대 가능 권한 이상만 만들 수 있습니다." });
      return;
    }

    try {
      const nextSurvey = await createNextVersionMutation.mutateAsync(activeSurvey.id);
      setNotice({ tone: "success", message: `v${nextSurvey.versionNumber} 초안 버전을 만들었습니다.` });
    } catch {
      setNotice({ tone: "error", message: "다음 버전을 만들지 못했습니다." });
    }
  }
}

function StatusRow(props: { label: string; value: string }) {
  return (
    <div className="tg-settings-page__status-row">
      <span>{props.label}</span>
      <strong>{props.value}</strong>
    </div>
  );
}

function normalizePublicSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function isValidPublicSlug(value: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) && value.length <= 80;
}

function isValidEmail(value: string): boolean {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value);
}
