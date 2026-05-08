import type { Project } from "@pmo/shared-types";

export const projectsMock: Project[] = [
  { id: "prj-001", code: "PMO-2026-001", name: "차세대 업무 포털 구축", clientName: "TODO 고객사", projectType: "main", status: "running", pmName: "김PM", startDate: "2026-04-01", endDate: "2026-09-30" },
  { id: "prj-002", code: "PMO-2026-002", name: "데이터 플랫폼 제안", clientName: "TODO 고객사", projectType: "sub", status: "proposing", pmName: "이PM", startDate: "2026-05-01", endDate: "2026-05-29" },
  { id: "prj-003", code: "PMO-2026-003", name: "운영 안정화 지원", clientName: "TODO 고객사", projectType: "partner", status: "support", pmName: "박PM", startDate: "2026-03-01", endDate: "2026-06-30" }
  // TODO: ProjectType에 업무지원 전용 사업유형이 없으므로 projectType은 DTL 확정 후 보정 필요.
];
