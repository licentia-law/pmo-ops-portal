"use client";

import type { ProjectStatusCode, ProjectTypeCode } from "@pmo/shared-types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api";

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
  owner_name: string | null;
  created_at: string;
  updated_at: string;
};

export type ProjectLogRecord = {
  id: string;
  project_id: string;
  project_name: string | null;
  project_code: string | null;
  status: ProjectStatusCode;
  logged_at: string;
  author_name: string | null;
  content: string;
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
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    }
  });
  const envelope = (await response.json()) as ApiEnvelope<T>;
  if (!response.ok || envelope.error) {
    throw new Error(envelope.error?.message ?? "API 요청에 실패했습니다.");
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

export function getP1Screen<T = unknown>(screen: string) {
  return request<T>(`/p1-screens/${screen}`);
}
