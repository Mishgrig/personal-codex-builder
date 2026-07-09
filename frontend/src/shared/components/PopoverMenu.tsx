import type { ReactNode } from "react";

interface PopoverMenuProps {
  icon: ReactNode;
  label: string;
  children: ReactNode;
  align?: "left" | "right";
  triggerClassName?: string;
}

export function PopoverMenu({ icon, label, children, align = "right", triggerClassName = "" }: PopoverMenuProps) {
  return (
    <details className={`popover-menu ${align === "left" ? "align-left" : "align-right"}`}>
      <summary className={`icon-button ${triggerClassName}`.trim()} aria-label={label} title={label}>
        {icon}
      </summary>
      <div className="popover-menu-panel">
        <div className="popover-menu-header">{label}</div>
        <div className="popover-menu-body">{children}</div>
      </div>
    </details>
  );
}
