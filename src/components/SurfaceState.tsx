import { AlertCircle, Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "./Button";
import "./css/SurfaceState.css";

type SurfaceStateProps = Readonly<{
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: ReactNode;
}>;

export function LoadingState(props: { label?: string }) {
  return (
    <div className="tg-surface-state" role="status">
      <Loader2 className="tg-surface-state__spinner" aria-hidden="true" size={18} />
      <span>{props.label ?? "불러오는 중"}</span>
    </div>
  );
}

export function ErrorState(props: SurfaceStateProps) {
  return <SurfaceState {...props} icon={props.icon ?? <AlertCircle size={18} aria-hidden="true" />} tone="danger" />;
}

export function EmptyState(props: SurfaceStateProps) {
  return <SurfaceState {...props} tone="neutral" />;
}

function SurfaceState(props: SurfaceStateProps & { tone: "neutral" | "danger" }) {
  return (
    <div className={`tg-surface-state tg-surface-state--${props.tone}`}>
      {props.icon ? <div className="tg-surface-state__icon">{props.icon}</div> : null}
      <div className="tg-surface-state__copy">
        <p className="tg-surface-state__title">{props.title}</p>
        {props.description ? <p className="tg-surface-state__description">{props.description}</p> : null}
      </div>
      {props.actionLabel && props.onAction ? (
        <Button variant="secondary" onClick={props.onAction}>
          {props.actionLabel}
        </Button>
      ) : null}
    </div>
  );
}
