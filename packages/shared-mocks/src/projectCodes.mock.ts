import type { ProjectCode } from "@pmo/shared-types";

export const projectCodesMock: ProjectCode[] = [
  { id: "code-001", code: "PMO-2026-001", name: "차세대 업무 포털 구축", projectType: "main", status: "running", ownerName: "김PM" },
  { id: "code-002", code: "PMO-2026-002", name: "데이터 플랫폼 제안", projectType: "sub", status: "proposing", ownerName: "이PM" },
  { id: "code-003", code: "PMO-2026-003", name: "운영 안정화 지원", projectType: "partner", status: "support", ownerName: "박PM" }
];
