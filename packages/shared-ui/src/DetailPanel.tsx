import type { ReactNode } from "react";

export function DetailPanel({ title, children, actions }: { title: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <aside className="pmo-detail-panel">
      <header>
        <h2>{title}</h2>
        {actions ? <div>{actions}</div> : null}
      </header>
      <div className="pmo-detail-body">{children}</div>
    </aside>
  );
}
