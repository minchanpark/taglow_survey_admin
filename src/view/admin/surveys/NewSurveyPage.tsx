import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, FilePlus2, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { useAdminSessionQuery, useCreateSurveyMutation } from "../../../api/admin/query";
import { Button, ErrorState, LoadingState, StatusBadge } from "../../../components";
import "./css/NewSurveyPage.css";

const newSurveySchema = z.object({
  title: z.string().trim().min(1, "설문 제목을 입력해주세요.").max(120, "제목은 120자 이하로 입력해주세요."),
  titleEn: z.string().trim().max(120, "영어 제목은 120자 이하로 입력해주세요.").optional(),
  description: z.string().trim().max(500, "설명은 500자 이하로 입력해주세요.").optional(),
  enableEnglish: z.boolean(),
  collectBasicProfile: z.boolean(),
});

type NewSurveyFormValues = z.infer<typeof newSurveySchema>;

export function NewSurveyPage() {
  const navigate = useNavigate();
  const sessionQuery = useAdminSessionQuery();
  const createSurveyMutation = useCreateSurveyMutation();
  const form = useForm<NewSurveyFormValues>({
    resolver: zodResolver(newSurveySchema),
    defaultValues: {
      title: "",
      titleEn: "",
      description: "",
      enableEnglish: true,
      collectBasicProfile: true,
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    createSurveyMutation.mutate(
      {
        title: values.titleEn?.trim() ? { ko: values.title, en: values.titleEn.trim() } : { ko: values.title },
        description: values.description ? { ko: values.description } : undefined,
        settings: {
          locales: values.enableEnglish ? ["ko", "en"] : ["ko"],
          defaultLocale: "ko",
          collectBasicProfile: values.collectBasicProfile,
          participantAccess: "google",
        },
      },
      {
        onSuccess: (survey) => {
          navigate(`/admin/surveys/${survey.id}/builder`);
        },
      },
    );
  });

  if (sessionQuery.isPending) {
    return (
      <section className="tg-new-survey-page" aria-labelledby="new-survey-title">
        <LoadingState label="계정 권한을 확인하는 중" />
      </section>
    );
  }

  if (!sessionQuery.data?.admin?.isActive) {
    return (
      <section className="tg-new-survey-page" aria-labelledby="new-survey-title">
        <header className="tg-new-survey-page__header">
          <div>
            <Link to="/admin/surveys" className="tg-new-survey-page__back">
              <ArrowLeft size={16} aria-hidden="true" />
              설문 목록
            </Link>
            <h1 id="new-survey-title">새 설문</h1>
          </div>
        </header>
        <ErrorState
          title="설문을 만들 수 없습니다."
          description="공유받은 설문은 접근 권한에 따라 볼 수 있지만, 새 설문을 만들려면 관리자 승인이 필요합니다."
          actionLabel="관리자 권한 요청"
          onAction={() => navigate("/admin/profile")}
        />
      </section>
    );
  }

  return (
    <section className="tg-new-survey-page" aria-labelledby="new-survey-title">
      <header className="tg-new-survey-page__header">
        <div>
          <Link to="/admin/surveys" className="tg-new-survey-page__back">
            <ArrowLeft size={16} aria-hidden="true" />
            설문 목록
          </Link>
          <h1 id="new-survey-title">새 설문</h1>
          <p>기본 정보를 저장하면 섹션과 질문을 구성할 수 있습니다.</p>
        </div>
        <StatusBadge tone="info">초안 생성</StatusBadge>
      </header>

      <form className="tg-new-survey-page__form" onSubmit={onSubmit} noValidate>
        <fieldset className="tg-new-survey-page__section" disabled={createSurveyMutation.isPending}>
          <legend>기본 정보</legend>
          <div className="tg-new-survey-page__field-row">
            <label className="tg-new-survey-page__field">
              <span>설문 제목</span>
              <input
                type="text"
                placeholder="예: 2026 봄학기 생활관 만족도 조사"
                aria-invalid={Boolean(form.formState.errors.title)}
                {...form.register("title")}
              />
              {form.formState.errors.title ? (
                <small className="tg-new-survey-page__error">{form.formState.errors.title.message}</small>
              ) : null}
            </label>

            <label className="tg-new-survey-page__field">
              <span>영어 제목</span>
              <input
                type="text"
                placeholder="Example: 2026 Spring Dormitory Survey"
                aria-invalid={Boolean(form.formState.errors.titleEn)}
                {...form.register("titleEn")}
              />
              {form.formState.errors.titleEn ? (
                <small className="tg-new-survey-page__error">{form.formState.errors.titleEn.message}</small>
              ) : null}
            </label>
          </div>

          <label className="tg-new-survey-page__field">
            <span>설명</span>
            <textarea
              rows={4}
              placeholder="관리자와 참여자가 설문 목적을 이해할 수 있도록 짧게 적어주세요."
              aria-invalid={Boolean(form.formState.errors.description)}
              {...form.register("description")}
            />
            {form.formState.errors.description ? (
              <small className="tg-new-survey-page__error">{form.formState.errors.description.message}</small>
            ) : null}
          </label>
        </fieldset>

        <fieldset className="tg-new-survey-page__section" disabled={createSurveyMutation.isPending}>
          <legend>초기 설정</legend>
          <label className="tg-new-survey-page__check">
            <input type="checkbox" {...form.register("enableEnglish")} />
            <span>
              <strong>영어 문항 입력 준비</strong>
              <small>한국어를 기본으로 저장하고, 빌더에서 영어 문구를 함께 입력할 수 있게 합니다.</small>
            </span>
          </label>

          <label className="tg-new-survey-page__check">
            <input type="checkbox" {...form.register("collectBasicProfile")} />
            <span>
              <strong>기본 정보로 응답 나눠보기</strong>
              <small>분석 화면에서 성별, 학기, 학부, RC, 생활관 등으로 응답을 나눠 볼 수 있게 합니다.</small>
            </span>
          </label>
        </fieldset>

        {createSurveyMutation.isError ? (
          <ErrorState
            title="설문을 생성하지 못했습니다."
            description="입력값, 관리자 권한, Supabase 연결 상태를 확인한 뒤 다시 시도해주세요."
          />
        ) : null}

        <footer className="tg-new-survey-page__actions">
          <Link to="/admin/surveys">
            <Button variant="secondary">취소</Button>
          </Link>
          <Button
            type="submit"
            variant="primary"
            icon={
              createSurveyMutation.isPending ? (
                <Loader2 className="tg-new-survey-page__spinner" size={16} aria-hidden="true" />
              ) : (
                <FilePlus2 size={16} aria-hidden="true" />
              )
            }
            disabled={createSurveyMutation.isPending}
          >
            설문 생성
          </Button>
        </footer>
      </form>
    </section>
  );
}
