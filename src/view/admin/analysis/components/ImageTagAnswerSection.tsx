import { AlertTriangle, MousePointer2 } from "lucide-react";
import type { ReactNode } from "react";
import type { ImageTagAnswer, ImageTagAnswerImage, JsonRecord } from "../../../../api/admin/model";
import { Button, EmptyState } from "../../../../components";
import "./css/ImageTagAnswerSection.css";

export type ImageTagAnswerGroup = Readonly<{
  key: string;
  kind: ImageTagAnswer["kind"];
  questionId?: string;
  questionTitle: string;
  questionType: ImageTagAnswer["questionType"];
  sectionTitle?: string;
  image?: ImageTagAnswerImage;
  answers: ImageTagAnswer[];
}>;

export function ImageTagAnswerSection(props: {
  headingId: string;
  title: string;
  description: string;
  icon: ReactNode;
  groups: ImageTagAnswerGroup[];
  emptyTitle: string;
  emptyDescription: string;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
}) {
  const answerCount = props.groups.reduce((sum, group) => sum + group.answers.length, 0);
  return (
    <section className="tg-analysis-section" aria-labelledby={props.headingId}>
      <header className="tg-analysis-section__header">
        <div>
          <span>{props.icon}</span>
          <h2 id={props.headingId}>{props.title}</h2>
        </div>
        <p>{props.description}</p>
        <strong>응답 수 {countUniqueImageTagResponses(props.groups.flatMap((group) => group.answers))}명 · 표시 {answerCount}개</strong>
      </header>
      {answerCount > 0 && answerCount < 5 ? (
        <div className="tg-analysis-warning">
          <AlertTriangle size={15} aria-hidden="true" />
          <span>표시가 {answerCount}개라 해석에 주의가 필요합니다.</span>
        </div>
      ) : null}

      {props.groups.length ? (
        <div className="tg-analysis-answer-grid">
          {props.groups.map((group) => (
            <ImageTagAnswerCard key={group.key} group={group} />
          ))}
        </div>
      ) : (
        <EmptyState title={props.emptyTitle} description={props.emptyDescription} />
      )}
      {props.hasMore ? (
        <div className="tg-analysis-load-more">
          <Button variant="secondary" onClick={props.onLoadMore} disabled={props.isLoadingMore}>
            {props.isLoadingMore ? "불러오는 중" : "더 보기"}
          </Button>
        </div>
      ) : null}
    </section>
  );
}

export function countUniqueImageTagResponses(answers: ImageTagAnswer[]): number {
  return new Set(answers.map((answer) => answer.responseId ?? answer.id)).size;
}

function ImageTagAnswerCard(props: { group: ImageTagAnswerGroup }) {
  const imageUrl = props.group.image?.signedUrl;
  return (
    <article className="tg-analysis-tag-card">
      <header className="tg-analysis-tag-card__header">
        <div>
          <p>{props.group.sectionTitle ?? "주제 없음"}</p>
          <h3>{props.group.questionTitle}</h3>
        </div>
        <span>{props.group.questionType === "participant_image_tag" ? "참여자가 올린 사진" : "준비된 사진"}</span>
      </header>

      <div className="tg-analysis-tag-card__visual" aria-label={`${props.group.questionTitle} 표시 위치`}>
        {imageUrl ? <img src={imageUrl} alt="" /> : <span>{props.group.image?.storagePath ?? "사진 미리보기가 없습니다."}</span>}
        {props.group.answers.map((answer, index) => (
          <i key={answer.id} style={{ left: `${answer.xRatio * 100}%`, top: `${answer.yRatio * 100}%` }}>
            {index + 1}
          </i>
        ))}
      </div>

      <div className="tg-analysis-tag-card__meta">
        <span>
          <MousePointer2 size={14} aria-hidden="true" />
          표시 {props.group.answers.length}개
        </span>
        <span>응답 수 {countUniqueImageTagResponses(props.group.answers)}명</span>
      </div>

      <ol className="tg-analysis-tag-list">
        {props.group.answers.map((answer, index) => (
          <li key={answer.id}>
            <strong>{index + 1}</strong>
            <div>
              <p>{answer.tagType ?? "표시"}</p>
              {answer.textValue ? <span>{answer.textValue}</span> : null}
              <small>
                {formatProfile(answer.responseProfile)}
                {" · "}
                가로 {formatRatio(answer.xRatio)} · 세로 {formatRatio(answer.yRatio)}
              </small>
            </div>
          </li>
        ))}
      </ol>
    </article>
  );
}

function formatProfile(profile: JsonRecord | undefined): string {
  if (!profile) return "기본 정보 없음";
  const parts = [profile.dormitory, profile.roomType, profile.rc, profile.department].filter(
    (value): value is string => typeof value === "string" && value.trim().length > 0,
  );
  return parts.length ? parts.join(" · ") : "기본 정보 없음";
}

function formatRatio(value: number): string {
  return `${Math.round(value * 100)}%`;
}
