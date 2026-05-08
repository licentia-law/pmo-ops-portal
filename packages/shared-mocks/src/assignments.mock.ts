import type { ProjectAssignment } from "@pmo/shared-types";

export const assignmentsMock: ProjectAssignment[] = [
  { id: "asg-001", personnelName: "김PM", projectName: "차세대 업무 포털 구축", assignmentType: "delivery", startDate: "2026-04-01", endDate: "2026-09-30", mm: 1 },
  { id: "asg-002", personnelName: "이PL", projectName: "데이터 플랫폼 제안", assignmentType: "proposal", startDate: "2026-05-01", endDate: "2026-05-29", mm: 0.5 },
  { id: "asg-003", personnelName: "박컨설턴트", projectName: "미배정", assignmentType: "unassigned", startDate: "2026-05-01", endDate: "2026-05-31", mm: 0 }
];
