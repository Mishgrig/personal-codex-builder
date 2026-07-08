import type { ReactNode } from "react";

interface PanelCardProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function PanelCard({ title, subtitle, actions, children, className = "" }: PanelCardProps) {
  return (
    <section className={`panel-card ${className}`.trim()}>
      <header className="panel-card-header">
        <div>
          <h2>{title}</h2>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
        {actions ? <div className="panel-card-actions">{actions}</div> : null}
      </header>
      <div className="panel-card-body">{children}</div>
    </section>
  );
}
