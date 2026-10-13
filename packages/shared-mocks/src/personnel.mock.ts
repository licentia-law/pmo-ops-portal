import type { Personnel } from "@pmo/shared-types";

export const personnelMock: Personnel[] = [
  { id: "per-001", name: "김PM", teamName: "PMO 1팀", roleName: "PM", personnelType: "pmo", employmentStatus: "active" },
  { id: "per-002", name: "이PL", teamName: "PMO 1팀", roleName: "PL", personnelType: "pmo", employmentStatus: "active" },
  { id: "per-003", name: "박컨설턴트", teamName: "PMO 2팀", roleName: "팀원", personnelType: "pmo", employmentStatus: "waiting" },
  { id: "per-004", name: "최컨설턴트", teamName: "PMO 2팀", roleName: "팀원", personnelType: "pmo", employmentStatus: "leave" }
];
