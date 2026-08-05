import type { ComponentPropsWithoutRef, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost";
type ButtonSize = "sm" | "md" | "icon";

interface ButtonProps extends ComponentPropsWithoutRef<"button"> {
  icon?: ReactNode;
  size?: ButtonSize;
  variant?: ButtonVariant;
}

export function Button({ children, className = "", icon, size = "md", variant = "secondary", ...props }: ButtonProps) {
  return (
    <button className={`uiButton uiButton-${variant} uiButton-${size} ${className}`} {...props}>
      {icon ? <span className="uiButtonIcon">{icon}</span> : null}
      {children ? <span>{children}</span> : null}
    </button>
  );
}

interface CardProps extends ComponentPropsWithoutRef<"article"> {
  interactive?: boolean;
}

export function Card({ children, className = "", interactive = false, ...props }: CardProps) {
  return (
    <article className={`uiCard ${interactive ? "uiCard-interactive" : ""} ${className}`} {...props}>
      {children}
    </article>
  );
}

interface BadgeProps extends ComponentPropsWithoutRef<"span"> {
  tone?: "gray" | "green" | "blue";
}

export function Badge({ children, className = "", tone = "gray", ...props }: BadgeProps) {
  return (
    <span className={`uiBadge uiBadge-${tone} ${className}`} {...props}>
      {children}
    </span>
  );
}

interface AlertProps extends ComponentPropsWithoutRef<"section"> {
  icon?: ReactNode;
  title: string;
}

export function Alert({ children, className = "", icon, title, ...props }: AlertProps) {
  return (
    <section className={`uiAlert ${className}`} {...props}>
      {icon ? <span className="uiAlertIcon">{icon}</span> : null}
      <div>
        <strong>{title}</strong>
        {children ? <div className="uiAlertBody">{children}</div> : null}
      </div>
    </section>
  );
}

interface FieldProps {
  children: ReactNode;
  icon?: ReactNode;
  label: string;
}

export function Field({ children, icon, label }: FieldProps) {
  return (
    <label className="uiField">
      <span className="uiFieldLabel">
        {icon ? <span className="uiFieldIcon">{icon}</span> : null}
        {label}
      </span>
      {children}
    </label>
  );
}

export function Input({ className = "", ...props }: ComponentPropsWithoutRef<"input">) {
  return <input className={`uiControl ${className}`} {...props} />;
}

export function Select({ className = "", children, ...props }: ComponentPropsWithoutRef<"select">) {
  return (
    <select className={`uiControl uiSelect ${className}`} {...props}>
      {children}
    </select>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <span className={`uiSkeleton ${className}`} aria-hidden="true" />;
}

export function EmptyState({ children, title }: { children?: ReactNode; title: string }) {
  return (
    <Card className="emptyState">
      <strong>{title}</strong>
      {children ? <p>{children}</p> : null}
    </Card>
  );
}
