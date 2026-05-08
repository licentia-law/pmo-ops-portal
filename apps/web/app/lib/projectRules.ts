import type { ProjectStatusCode } from "@pmo/shared-types";

export const ALLOWED_STATUS_TRANSITIONS: Record<ProjectStatusCode, ProjectStatusCode[]> = {
  proposing: ["presented", "drop"],
  presented: ["win", "loss"],
  win: ["running"],
  loss: [],
  drop: [],
  running: ["done"],
  support: ["done"],
  done: []
};

export function canTransitionStatus(current: ProjectStatusCode, next: ProjectStatusCode): boolean {
  return current === next || ALLOWED_STATUS_TRANSITIONS[current].includes(next);
}
