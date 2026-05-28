import type { ButtonHTMLAttributes, ReactNode } from "react";
import "./css/Button.css";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  icon?: ReactNode;
};

export function Button({ variant = "secondary", icon, children, className, type = "button", ...props }: ButtonProps) {
  const classNames = ["tg-button", `tg-button--${variant}`, className].filter(Boolean).join(" ");
  return (
    <button className={classNames} type={type} {...props}>
      {icon ? <span className="tg-button__icon">{icon}</span> : null}
      {children ? <span className="tg-button__label">{children}</span> : null}
    </button>
  );
}
