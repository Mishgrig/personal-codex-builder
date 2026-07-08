import type { ButtonHTMLAttributes, ReactNode } from "react";

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  danger?: boolean;
}

export function IconButton({ children, className = "", danger = false, ...props }: IconButtonProps) {
  return (
    <button
      {...props}
      className={`icon-button${danger ? " danger" : ""}${className ? ` ${className}` : ""}`}
    >
      {children}
    </button>
  );
}
