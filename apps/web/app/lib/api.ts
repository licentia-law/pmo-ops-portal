"use client";

import type { ProjectStatusCode, ProjectTypeCode } from "@pmo/shared-types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8001/api";

export type UserPermission = "read_only" | "general_editor" | "project_editor" | "admin";
export type OrganizationRole = "head" | "team_lead" | "member" | "pm" | "pl" | "other";

export type DevUserContext = {
  name: string;
  email: string;
  team: string;
  role: string;
  permission: UserPermission;
  organizationRole: OrganizationRole;
};

export type ApiEnvelope<T> = {
  data: T;
  meta: {
    page?: number;
    page_size?: number;
    total?: number;
    [key: string]: unknown;
  };
  error: { code: string; message: string } | null;
};

type FastApiErrorBody = {
  detail?: Array<{
    loc?: Array<string | number>;
    msg?: string;
    type?: string;
  }> | string;
};

const USER_PERMISSION_VALUES = new Set(["read_only", "general_editor", "project_editor", "admin"]);
const ORGANIZATION_ROLE_VALUES = new Set(["head", "team_lead", "member", "pm", "pl", "other"]);

function readBrowserValue(key: string) {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(key);
}

function permissionValue(value: string | null | undefined): UserPermission {
  return USER_PERMISSION_VALUES.has(value ?? "") ? (value as UserPermission) : "admin";
}

function organizationRoleValue(value: string | null | undefined): OrganizationRole {
  return ORGANIZATION_ROLE_VALUES.has(value ?? "") ? (value as OrganizationRole) : "other";
}

function headerSafeValue(value: string, fallback: string) {
  return /^[\u0000-\u00ff]*$/.test(value) ? value : fallback;
}

export function getDevUserContext(): DevUserContext {
  const permission = permissionValue(
    readBrowserValue("pmo.dev.permission") ?? process.env.NEXT_PUBLIC_DEV_USER_PERMISSION
  );
  const organizationRole = organizationRoleValue(
    readBrowserValue("pmo.dev.organizationRole") ?? process.env.NEXT_PUBLIC_DEV_USER_ORGANIZATION_ROLE
  );
  return {
    name: readBrowserValue("pmo.dev.name") ?? process.env.NEXT_PUBLIC_DEV_USER_NAME ?? "관리자",
    email: readBrowserValue("pmo.dev.email") ?? process.env.NEXT_PUBLIC_DEV_USER_EMAIL ?? "admin@example.local",
    team: readBrowserValue("pmo.dev.team") ?? process.env.NEXT_PUBLIC_DEV_USER_TEAM ?? "PMO본부",
    role: readBrowserValue("pmo.dev.role") ?? process.env.NEXT_PUBLIC_DEV_USER_ROLE ?? "관리자",
    permission,
    organizationRole
  };
}

function authHeaders(): Record<string, string> {
  const user = getDevUserContext();
  return {
    "x-user-name": headerSafeValue(user.name, "admin"),
    "x-user-email": headerSafeValue(user.email, "admin@example.local"),
    "x-user-permission": user.permission,
    "x-user-organization-role": user.organizationRole
  };
}

export type ProjectRecord = {
  id: string;
  code: string;
  name: string;
  client_name: string | null;
  project_type: ProjectTypeCode;
  status: ProjectStatusCode;
  proposal_pm_name: string | null;
  presentation_pm_name: string | null;
  delivery_pm_name: string | null;
  memo: string | null;
  start_date: string | null;
  end_date: string | null;
  project_code_id: string | null;
  created_at: string;
  updated_at: string;
  allowed_next_statuses?: ProjectStatusCode[];
};

export type ProjectCodeRecord = {
  id: string;
  code: string;
  name: string;
  project_type: ProjectTypeCode;
  status: ProjectStatusCode;
  sales_owner: string | null;
  created_at: string;
  updated_at: string;
};

export type ProjectLogRecord = {
  id: string;
  project_id: string;
  project_name: string | null;
  project_code: string | null;
  log_status: "memo" | "in_progress" | "done";
  logged_at: string;
  author_name: string;
  updated_by_name: string | null;
  content: string;
  created_at: string;
  updated_at: string;
};

export type PersonnelRecord = {
  id: string;
  employee_no: string | null;
  name: string;
  email: string | null;
  group_name: string | null;
  team_name: string | null;
  position_name: string | null;
  role_id: string | null;
  role_code?: string | null;
  role_name: string | null;
  job_group?: string | null;
  employment_status: "active" | "leave" | "transferred" | "retired" | "waiting";
  mm_start_date: string | null;
  mm_end_date: string | null;
  yearly_mm: number | null;
  is_active?: boolean | null;
  note: string | null;
  created_at: string;
  updated_at: string;
};

export type RoleRecord = {
  id: string;
  code: string;
  name: string;
  job_group: string | null;
  description: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type MonthlyEmploymentMMRecord = {
  id: string;
  personnel_id: string | null;
  personnel_name: string | null;
  group_name: string | null;
  team_name: string | null;
  year: number;
  month: number;
  workdays: number | null;
  employed_workdays: number | null;
  employment_mm: number;
  note: string | null;
  created_at: string;
  updated_at: string;
};

export type ListQuery = {
  page?: number;
  page_size?: number;
  sort?: string;
  q?: string;
  status?: string;
  project_type?: string;
  project_id?: string;
  log_status?: "memo" | "in_progress" | "done";
  group_name?: string;
  team_name?: string;
  position_name?: string;
  employment_status?: string;
  role_id?: string;
  is_active?: boolean;
  job_group?: string;
  year?: number;
  month?: number;
  personnel_id?: string;
};

function qs(query?: ListQuery): string {
  const params = new URLSearchParams();
  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value) !== "") {
      params.set(key, String(value));
    }
  });
  const value = params.toString();
  return value ? `?${value}` : "";
}

async function request<T>(path: string, init?: RequestInit): Promise<ApiEnvelope<T>> {
  const hasBody = init?.body !== undefined;
  const method = String(init?.method ?? "GET").toUpperCase();
  const shouldSendAuthHeaders = hasBody || method !== "GET";
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        ...(hasBody ? { "Content-Type": "application/json" } : {}),
        ...(shouldSendAuthHeaders ? authHeaders() : {}),
        ...(init?.headers ?? {})
      }
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "unknown network error";
    throw new Error(`API 서버에 연결할 수 없습니다. ${API_BASE_URL} 상태를 확인하세요. (${detail})`);
  }
  const payload = (await response.json()) as ApiEnvelope<T> | FastApiErrorBody;
  const envelope = payload as ApiEnvelope<T>;
  if (!response.ok || envelope.error) {
    const fastApiDetail = (payload as FastApiErrorBody).detail;
    if (envelope?.error?.message) {
      throw new Error(envelope.error.message);
    }
    if (Array.isArray(fastApiDetail)) {
      const validationMessage = fastApiDetail
        .map((item: { msg?: string }) => item.msg?.trim())
        .filter(Boolean)
        .join(" / ");
      if (validationMessage) {
        throw new Error(validationMessage);
      }
    }
    if (typeof fastApiDetail === "string") {
      throw new Error(fastApiDetail);
    }
    throw new Error(`API 요청에 실패했습니다. (${response.status})`);
  }
  return envelope;
}

export function listProjects(query?: ListQuery) {
  return request<ProjectRecord[]>(`/projects${qs(query)}`);
}

export function createProject(payload: Partial<ProjectRecord>) {
  return request<ProjectRecord>("/projects", { method: "POST", body: JSON.stringify(payload) });
}

export function getProject(projectId: string) {
  return request<ProjectRecord>(`/projects/${projectId}`);
}

export function updateProject(projectId: string, payload: Partial<ProjectRecord>) {
  return request<ProjectRecord>(`/projects/${projectId}`, { method: "PATCH", body: JSON.stringify(payload) });
}

export function listProjectCodes(query?: ListQuery) {
  return request<ProjectCodeRecord[]>(`/project-codes${qs(query)}`);
}

export function createProjectCode(payload: Partial<ProjectCodeRecord>) {
  return request<ProjectCodeRecord>("/project-codes", { method: "POST", body: JSON.stringify(payload) });
}

export function updateProjectCode(projectCodeId: string, payload: Partial<ProjectCodeRecord>) {
  return request<ProjectCodeRecord>(`/project-codes/${projectCodeId}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export function listProjectLogs(query?: ListQuery) {
  return request<ProjectLogRecord[]>(`/project-logs${qs(query)}`);
}

export function createProjectLog(payload: Partial<ProjectLogRecord>) {
  return request<ProjectLogRecord>("/project-logs", { method: "POST", body: JSON.stringify(payload) });
}

export function getProjectLog(logId: string) {
  return request<ProjectLogRecord>(`/project-logs/${logId}`);
}

export function updateProjectLog(logId: string, payload: Partial<ProjectLogRecord>) {
  return request<ProjectLogRecord>(`/project-logs/${logId}`, { method: "PATCH", body: JSON.stringify(payload) });
}

export function listPersonnel(query?: ListQuery) {
  return request<PersonnelRecord[]>(`/personnel${qs(query)}`);
}

export function createPersonnel(payload: Partial<PersonnelRecord>) {
  return request<PersonnelRecord>("/personnel", { method: "POST", body: JSON.stringify(payload) });
}

export function updatePersonnel(personnelId: string, payload: Partial<PersonnelRecord>) {
  return request<PersonnelRecord>(`/personnel/${personnelId}`, { method: "PATCH", body: JSON.stringify(payload) });
}

export function listRoles(query?: ListQuery) {
  return request<RoleRecord[]>(`/roles${qs(query)}`);
}

export function createRole(payload: Partial<RoleRecord>) {
  return request<RoleRecord>("/roles", { method: "POST", body: JSON.stringify(payload) });
}

export function updateRole(roleId: string, payload: Partial<RoleRecord>) {
  return request<RoleRecord>(`/roles/${roleId}`, { method: "PATCH", body: JSON.stringify(payload) });
}

export function listMonthlyEmploymentMM(query?: ListQuery) {
  return request<MonthlyEmploymentMMRecord[]>(`/monthly-employment-mm${qs(query)}`);
}

export function updateMonthlyEmploymentMM(monthlyEmploymentMmId: string, payload: Partial<MonthlyEmploymentMMRecord>) {
  return request<MonthlyEmploymentMMRecord>(`/monthly-employment-mm/${monthlyEmploymentMmId}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export function getP1Screen<T = unknown>(screen: string) {
  return request<T>(`/p1-screens/${screen}`);
}

export function getP1ScreenWithQuery<T = unknown>(screen: string, query?: Record<string, string>) {
  const params = new URLSearchParams();
  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  const suffix = params.toString() ? `?${params.toString()}` : "";
  return request<T>(`/p1-screens/${screen}${suffix}`);
}
