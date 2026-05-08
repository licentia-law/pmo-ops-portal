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
    items: [{ id: "home", label: "홈", href: ROUTES.home }, { id: "dashboard", label: "대시보드", href: ROUTES.dashboard }]
  },
  {
    id: "projects",
    label: "프로젝트",
    items: [
      { id: "project-operations", label: "업무수행현황", href: ROUTES.projectOperations },
      { id: "project-codes", label: "프로젝트코드", href: ROUTES.projectCodes },
      { id: "project-detail", label: "프로젝트 상세", href: ROUTES.projectDetail() },
      { id: "project-logs", label: "진행이력", href: ROUTES.projectLogs }
    ]
  },
  {
    id: "people",
    label: "인력",
    items: [
      { id: "people-employment", label: "인력재직현황", href: ROUTES.peopleEmployment },
      { id: "people-assignments", label: "인력배치/투입현황", href: ROUTES.peopleAssignments },
      { id: "people-current", label: "인원별 투입(현재)", href: ROUTES.peopleCurrent },
      { id: "people-waiting", label: "대기현황", href: ROUTES.peopleWaiting }
    ]
  },
  {
    id: "reports",
    label: "KPI/보고",
    items: [
      { id: "reports-weekly", label: "주간현황", href: ROUTES.reportsWeekly },
      { id: "reports-monthly", label: "월별가동현황", href: ROUTES.reportsMonthly },
      { id: "reports-waiting-proposal", label: "대기/제안인원", href: ROUTES.reportsWaitingProposal },
      { id: "reports-proposal-projects", label: "제안PRJ", href: ROUTES.reportsProposalProjects },
      { id: "reports-delivery-projects", label: "이행PRJ", href: ROUTES.reportsDeliveryProjects },
      { id: "reports-downloads", label: "보고서 다운로드", href: ROUTES.reportsDownloads }
    ]
  },
  {
    id: "admin",
    label: "관리자",
    items: [
      { id: "admin-users", label: "사용자/권한 관리", href: ROUTES.adminUsers },
      { id: "admin-master-data", label: "기준정보 관리", href: ROUTES.adminMasterData },
      { id: "admin-holidays", label: "공휴일 관리", href: ROUTES.adminHolidays },
      { id: "admin-monthly-closing", label: "월마감/스냅샷", href: ROUTES.adminMonthlyClosing }
    ]
  }
];
