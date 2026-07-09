import type { ReactNode } from "react";

interface CollapsibleSectionProps {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}

export function CollapsibleSection({ title, defaultOpen = true, children }: CollapsibleSectionProps) {
  return (
    <details className="detail-section" open={defaultOpen}>
      <summary className="section-header">
        <h3>{title}</h3>
      </summary>
      {children}
    </details>
  );
}
