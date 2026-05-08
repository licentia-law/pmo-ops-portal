import { PROJECT_STATUSES, labelFor, type ProjectStatusCode } from "@pmo/shared-types";

export function StatusBadge({ code }: { code: ProjectStatusCode }) {
  return <span className={`pmo-status-badge pmo-status-${code}`}>{labelFor(PROJECT_STATUSES, code)}</span>;
}
