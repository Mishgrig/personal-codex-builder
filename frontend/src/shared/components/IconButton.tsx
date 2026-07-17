import type { ButtonHTMLAttributes, ReactNode } from "react";

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  danger?: boolean;
}

export function IconButton({
  children,
  className = "",
  danger = false,
  title,
  "aria-label": ariaLabel,
  ...props
}: IconButtonProps) {
  return (
    <button
      {...props}
      title={title}
      aria-label={ariaLabel ?? (typeof title === "string" ? title : undefined)}
      className={`icon-button${danger ? " danger" : ""}${className ? ` ${className}` : ""}`}
    >
      {children}
    </button>
  );
}
