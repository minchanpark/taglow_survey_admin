import type { ReactNode } from "react";
import type { SurveyStatus } from "../api/admin/model";
import "./css/StatusBadge.css";

type StatusTone = SurveyStatus | "warning" | "info" | "success" | "danger";

const statusLabels: Record<SurveyStatus, string> = {
  draft: "초안",
  published: "게시됨",
  closed: "종료",
  archived: "보관",
};

export function SurveyStatusBadge(props: { status: SurveyStatus }) {
  return <StatusBadge tone={props.status}>{statusLabels[props.status]}</StatusBadge>;
}

export function StatusBadge(props: { tone?: StatusTone; children: ReactNode }) {
  return <span className={`tg-status-badge tg-status-badge--${props.tone ?? "info"}`}>{props.children}</span>;
}
