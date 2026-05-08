"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PROJECT_STATUSES, PROJECT_TYPES, ROUTES, labelFor, type ProjectStatusCode, type ProjectTypeCode } from "@pmo/shared-types";
import { AppShell, BaseTable, FilterBar, Pagination, SelectFilter, StatusBadge, TextFilter, type Column } from "@pmo/shared-ui";
import { createProject, listProjects, updateProject, type ProjectRecord } from "../../lib/api";
import { ALLOWED_STATUS_TRANSITIONS, canTransitionStatus } from "../../lib/projectRules";

type ProjectForm = {
  name: string;
  client_name: string;
  project_type: ProjectTypeCode;
  status: ProjectStatusCode;
  pm_name: string;
  start_date: string;
  end_date: string;
};

const emptyForm: ProjectForm = {
  name: "",
  client_name: "",
  project_type: "main",
  status: "proposing",
  pm_name: "",
  start_date: "",
  end_date: ""
};

export default function ProjectOperationsPage() {
  const [rows, setRows] = useState<ProjectRecord[]>([]);
  const [meta, setMeta] = useState({ page: 1, page_size: 10, total: 0 });
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [projectType, setProjectType] = useState("");
  const [form, setForm] = useState<ProjectForm>(emptyForm);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      const result = await listProjects({ q, status, project_type: projectType, page: 1, page_size: 10 });
      setRows(result.data);
      setMeta({
        page: Number(result.meta.page ?? 1),
        page_size: Number(result.meta.page_size ?? 10),
        total: Number(result.meta.total ?? 0)
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "조회에 실패했습니다.");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function submitProject() {
    if (!form.name.trim()) {
      setError("사업명은 필수입니다.");
      return;
    }
    await createProject({
      ...form,
      client_name: form.client_name || null,
      pm_name: form.pm_name || null,
      start_date: form.start_date || null,
      end_date: form.end_date || null
    });
    setForm(emptyForm);
    await load();
  }

  async function changeStatus(project: ProjectRecord, nextStatus: ProjectStatusCode) {
    if (!canTransitionStatus(project.status, nextStatus)) {
      setError("허용되지 않는 상태 전환입니다.");
      return;
    }
    await updateProject(project.id, { status: nextStatus });
    await load();
  }

  const columns = useMemo<Column<ProjectRecord>[]>(
    () => [
      { key: "code", header: "프로젝트코드", render: (row) => row.code },
      { key: "name", header: "사업명", render: (row) => <Link href={ROUTES.projectDetail(row.id)}>{row.name}</Link> },
      { key: "type", header: "사업유형", render: (row) => labelFor(PROJECT_TYPES, row.project_type) },
      { key: "pm", header: "총괄PM", render: (row) => row.pm_name ?? "-" },
      { key: "period", header: "기간", render: (row) => `${row.start_date ?? "-"} ~ ${row.end_date ?? "-"}` },
      { key: "status", header: "상태", render: (row) => <StatusBadge code={row.status} /> },
      {
        key: "next",
        header: "상태 전환",
        render: (row) => (
          <select
            aria-label={`${row.name} 상태 전환`}
            defaultValue=""
            disabled={ALLOWED_STATUS_TRANSITIONS[row.status].length === 0}
            onChange={(event) => void changeStatus(row, event.target.value as ProjectStatusCode)}
          >
            <option value="">선택</option>
            {ALLOWED_STATUS_TRANSITIONS[row.status].map((code) => (
              <option value={code} key={code}>{labelFor(PROJECT_STATUSES, code)}</option>
            ))}
          </select>
        )
      }
    ],
    [rows]
  );

  return (
    <AppShell currentPath={ROUTES.projectOperations} pageTitle="업무수행현황">
      <div className="pmo-page-stack">
        <FilterBar actions={<button className="pmo-btn" onClick={() => void load()}>조회</button>}>
          <label className="pmo-field">
            <span>검색어</span>
            <input value={q} onChange={(event) => setQ(event.target.value)} placeholder="프로젝트명/코드/PM" />
          </label>
          <label className="pmo-field">
            <span>상태</span>
            <select value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="">전체</option>
              {PROJECT_STATUSES.map((option) => <option value={option.code} key={option.code}>{option.label}</option>)}
            </select>
          </label>
          <label className="pmo-field">
            <span>사업유형</span>
            <select value={projectType} onChange={(event) => setProjectType(event.target.value)}>
              <option value="">전체</option>
              {PROJECT_TYPES.map((option) => <option value={option.code} key={option.code}>{option.label}</option>)}
            </select>
          </label>
        </FilterBar>

        <section className="pmo-filter-bar" aria-label="프로젝트 등록">
          <div className="pmo-filter-fields">
            <label className="pmo-field"><span>사업명</span><input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
            <label className="pmo-field"><span>고객사</span><input value={form.client_name} onChange={(event) => setForm({ ...form, client_name: event.target.value })} /></label>
            <label className="pmo-field"><span>PM</span><input value={form.pm_name} onChange={(event) => setForm({ ...form, pm_name: event.target.value })} /></label>
            <label className="pmo-field"><span>시작일</span><input type="date" value={form.start_date} onChange={(event) => setForm({ ...form, start_date: event.target.value })} /></label>
            <label className="pmo-field"><span>완료일</span><input type="date" value={form.end_date} onChange={(event) => setForm({ ...form, end_date: event.target.value })} /></label>
            <label className="pmo-field"><span>사업유형</span><select value={form.project_type} onChange={(event) => setForm({ ...form, project_type: event.target.value as ProjectTypeCode })}>{PROJECT_TYPES.map((option) => <option value={option.code} key={option.code}>{option.label}</option>)}</select></label>
          </div>
          <div className="pmo-filter-actions"><button className="pmo-btn" onClick={() => void submitProject()}>신규 등록</button></div>
        </section>

        {error ? <div className="pmo-panel pmo-error">{error}</div> : null}
        <BaseTable columns={columns} rows={rows} />
        <Pagination page={meta.page} pageSize={meta.page_size} total={meta.total} />
      </div>
    </AppShell>
  );
}
