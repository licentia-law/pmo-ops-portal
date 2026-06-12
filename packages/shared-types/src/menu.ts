import { ROUTES } from "./routes";

export type MenuItem = {
  id: string;
  label: string;
  href: string;
};

export type MenuGroup = {
  id: string;
  label: string;
  items: MenuItem[];
};

export const MENU_CONFIG: MenuGroup[] = [
  {
    id: "home",
    label: "홈",
    items: [{ id: "home", label: "홈", href: ROUTES.home }]
  },
  {
    id: "projects",
    label: "프로젝트",
    items: [
      { id: "project-operations", label: "업무수행현황", href: ROUTES.projectOperations },
      { id: "project-logs", label: "진행이력", href: ROUTES.projectLogs }
    ]
  },
  {
    id: "people",
    label: "인력",
    items: [
      { id: "people-assignments", label: "인력 투입 현황", href: ROUTES.peopleAssignments }
    ]
  },
  {
    id: "reports",
    label: "KPI/보고",
    items: [
      { id: "reports-weekly", label: "주간현황", href: ROUTES.reportsWeekly },
      { id: "reports-monthly", label: "월별가동현황", href: ROUTES.reportsMonthly }
    ]
  },
  {
    id: "admin",
    label: "관리",
    items: [
      { id: "admin-users", label: "사용자/권한 관리", href: ROUTES.adminUsers },
      { id: "admin-master-data", label: "기준정보 관리", href: ROUTES.adminMasterData },
      { id: "project-codes", label: "프로젝트 관리", href: ROUTES.projectCodes },
      { id: "people-employment", label: "인력 관리", href: ROUTES.peopleEmployment },
      { id: "admin-holidays", label: "공휴일 관리", href: ROUTES.adminHolidays },
      { id: "admin-monthly-closing", label: "월마감/스냅샷", href: ROUTES.adminMonthlyClosing }
    ]
  }
];
