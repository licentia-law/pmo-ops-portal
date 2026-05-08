import type { ProjectLog } from "@pmo/shared-types";

export const projectLogsMock: ProjectLog[] = [
  { id: "log-001", projectName: "차세대 업무 포털 구축", status: "running", loggedAt: "2026-05-06", authorName: "김PM", content: "주간 진척 업데이트" },
  { id: "log-002", projectName: "데이터 플랫폼 제안", status: "presented", loggedAt: "2026-05-05", authorName: "이PM", content: "발표 완료" },
  { id: "log-003", projectName: "운영 안정화 지원", status: "support", loggedAt: "2026-05-04", authorName: "박PM", content: "지원 범위 조정 TODO" }
];
