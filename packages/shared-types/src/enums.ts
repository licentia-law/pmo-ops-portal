export type CodeLabel<TCode extends string> = {
  code: TCode;
  label: string;
};

export const PROJECT_STATUSES = [
  { code: "proposing", label: "제안중" },
  { code: "presented", label: "발표완료" },
  { code: "win", label: "WIN" },
  { code: "loss", label: "LOSS" },
  { code: "drop", label: "DROP" },
  { code: "running", label: "수행중" },
  { code: "support", label: "업무지원" },
  { code: "done", label: "완료" }
] as const;

export const PROJECT_TYPES = [
  { code: "main", label: "주사업" },
  { code: "sub", label: "부사업" },
  { code: "subcontract", label: "하도" },
  { code: "partner", label: "협력" }
] as const;

export const ASSIGNMENT_TYPES = [
  { code: "delivery", label: "수행" },
  { code: "proposal", label: "제안" },
  { code: "support", label: "지원" },
  { code: "unassigned", label: "미투입" }
] as const;

export const EMPLOYMENT_STATUSES = [
  { code: "active", label: "재직" },
  { code: "leave", label: "휴직" },
  { code: "transferred", label: "전배" },
  { code: "retired", label: "퇴직" },
  // TODO(DTL conflict): scaffolding DTL 예시는 "대기"를 포함하지만 공통 DTL 3.6에는 없음. 확정 전까지 mock 표시용으로만 사용.
  { code: "waiting", label: "대기" }
] as const;

export const USER_PERMISSIONS = [
  { code: "read_only", label: "조회 전용" },
  { code: "general_editor", label: "일반 수정 가능" },
  { code: "project_editor", label: "프로젝트 담당 수정 가능" },
  { code: "admin", label: "관리자" }
] as const;

export const ORGANIZATION_ROLES = [
  { code: "head", label: "본부장" },
  { code: "team_lead", label: "팀장" },
  { code: "member", label: "팀원" },
  // TODO(DTL conflict): 공통 DTL에는 PM/PL/기타가 있으나 사용자 요청의 enum 범위에는 "조직역할"만 명시됨. 확정 필요.
  { code: "pm", label: "PM" },
  { code: "pl", label: "PL" },
  { code: "other", label: "기타" }
] as const;

export const DATA_SCOPES = [
  { code: "all", label: "전체" },
  { code: "headquarters", label: "소속 본부" },
  { code: "team", label: "소속 팀" },
  { code: "own_projects", label: "본인 프로젝트" }
] as const;

export const REPORT_TYPES = [
  { code: "weekly", label: "주간현황" },
  { code: "monthly", label: "월별가동현황" },
  { code: "waiting_proposal", label: "대기/제안인원" },
  { code: "proposal_projects", label: "제안PRJ" },
  { code: "delivery_projects", label: "이행PRJ" }
] as const;

export const HOLIDAY_TYPES = [
  { code: "public", label: "공휴일" },
  { code: "company", label: "회사휴일" }
  // TODO: DTL에 공휴일 구분 코드 목록이 확정되어 있지 않아 최소 시작점만 둠.
] as const;

export type ProjectStatusCode = (typeof PROJECT_STATUSES)[number]["code"];
export type ProjectTypeCode = (typeof PROJECT_TYPES)[number]["code"];
export type AssignmentTypeCode = (typeof ASSIGNMENT_TYPES)[number]["code"];
export type EmploymentStatusCode = (typeof EMPLOYMENT_STATUSES)[number]["code"];
export type UserPermissionCode = (typeof USER_PERMISSIONS)[number]["code"];
export type OrganizationRoleCode = (typeof ORGANIZATION_ROLES)[number]["code"];
export type DataScopeCode = (typeof DATA_SCOPES)[number]["code"];
export type ReportTypeCode = (typeof REPORT_TYPES)[number]["code"];
export type HolidayTypeCode = (typeof HOLIDAY_TYPES)[number]["code"];

export function labelFor<T extends readonly CodeLabel<string>[]>(
  items: T,
  code: T[number]["code"]
): string {
  return items.find((item) => item.code === code)?.label ?? code;
}
