import type {
  AssignmentTypeCode,
  EmploymentStatusCode,
  ProjectStatusCode,
  ProjectTypeCode,
  UserPermissionCode
} from "./enums";

export type User = {
  id: string;
  name: string;
  email: string;
  teamName: string;
  permission: UserPermissionCode;
};

export type ProjectCode = {
  id: string;
  code: string;
  name: string;
  projectType: ProjectTypeCode;
  status: ProjectStatusCode;
  ownerName: string;
};

export type Project = {
  id: string;
  code: string;
  name: string;
  clientName: string;
  projectType: ProjectTypeCode;
  status: ProjectStatusCode;
  pmName: string;
  startDate: string;
  endDate: string;
};

export type ProjectLog = {
  id: string;
  projectName: string;
  status: ProjectStatusCode;
  loggedAt: string;
  authorName: string;
  content: string;
};

export type Personnel = {
  id: string;
  name: string;
  teamName: string;
  roleName: string;
  employmentStatus: EmploymentStatusCode;
};

export type ProjectAssignment = {
  id: string;
  personnelName: string;
  projectName: string;
  assignmentType: AssignmentTypeCode;
  startDate: string;
  endDate: string;
  mm: number;
};

export type DashboardSummary = {
  headcount: number;
  running: number;
  proposing: number;
  idle: number;
  utilizationRate: number;
  contractRate: number;
};
