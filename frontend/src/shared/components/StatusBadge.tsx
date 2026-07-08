import type { ReactNode } from "react";

type Tone = "neutral" | "success" | "warning" | "danger";

interface StatusBadgeProps {
  tone?: Tone;
  children: ReactNode;
}

export function StatusBadge({ tone = "neutral", children }: StatusBadgeProps) {
  return <span className={`status-badge status-${tone}`}>{children}</span>;
}
