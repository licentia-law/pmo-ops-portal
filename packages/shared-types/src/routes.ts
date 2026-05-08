export const ROUTES = {
  home: "/",
  login: "/login",
  dashboard: "/dashboard",
  projectOperations: "/projects/operations",
  projectCodes: "/projects/codes",
  projectDetail: (projectId: string = "TODO_PROJECT_ID") => `/projects/${projectId}`,
  projectLogs: "/projects/logs",
  peopleEmployment: "/people/employment",
  peopleAssignments: "/people/assignments",
  peopleCurrent: "/people/current",
  peopleWaiting: "/people/waiting",
  reportsWeekly: "/reports/weekly",
  reportsMonthly: "/reports/monthly",
  reportsWaitingProposal: "/reports/waiting-proposal",
  reportsProposalProjects: "/reports/proposal-projects",
  reportsDeliveryProjects: "/reports/delivery-projects",
  reportsDownloads: "/reports/downloads",
  adminUsers: "/admin/users",
  adminMasterData: "/admin/master-data",
  adminHolidays: "/admin/holidays",
  adminMonthlyClosing: "/admin/monthly-closing"
} as const;

export type RoutePath = (typeof ROUTES)[keyof typeof ROUTES];
