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
  reportsWeekly: "/reports/weekly",
  reportsMonthly: "/reports/monthly",
  adminUsers: "/admin/users",
  adminMasterData: "/admin/master-data",
  adminHolidays: "/admin/holidays",
  adminMonthlyClosing: "/admin/monthly-closing"
} as const;

export type RoutePath = (typeof ROUTES)[keyof typeof ROUTES];
