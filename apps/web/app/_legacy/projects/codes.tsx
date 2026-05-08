"use client";

import { useEffect, useMemo, useState } from "react";
import { PROJECT_STATUSES, PROJECT_TYPES, ROUTES, labelFor, type ProjectStatusCode, type ProjectTypeCode } from "@pmo/shared-types";
import { AppShell, BaseTable, FilterBar, Pagination, StatusBadge, type Column } from "@pmo/shared-ui";
import { createProjectCode, listProjectCodes, updateProjectCode, type ProjectCodeRecord } from "../../lib/api";

type CodeForm = {
  id?: string;
  code: string;
  name: string;
  project_type: ProjectTypeCode;
  status: ProjectStatusCode;
  owner_name: string;
};

const emptyForm: CodeForm = {
  code: "",
  name: "",
  project_type: "main",
  status: "proposing",
  owner_name: ""
};

export default function ProjectCodesPage() {
  const [rows, setRows] = useState<ProjectCodeRecord[]>([]);
  const [meta, setMeta] = useState({ page: 1, page_size: 10, total: 0 });
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [form, setForm] = useState<CodeForm>(emptyForm);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      const result = await listProjectCodes({ q, status, page: 1, page_size: 10 });
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

  async function save() {
    if (!form.name.trim()) {
      setError("프로젝트명은 필수입니다.");
      return;
    }
    const payload = {
      code: form.code || undefined,
      name: form.name,
      project_type: form.project_type,
      status: form.status,
      owner_name: form.owner_name || null
    };
    if (form.id) {
      await updateProjectCode(form.id, payload);
    } else {
      await createProjectCode(payload);
    }
    setForm(emptyForm);
    await load();
  }

  const columns = useMemo<Column<ProjectCodeRecord>[]>(
    () => [
      { key: "code", header: "코드", render: (row) => row.code },
      { key: "name", header: "프로젝트명", render: (row) => row.name },
      { key: "type", header: "사업유형", render: (row) => labelFor(PROJECT_TYPES, row.project_type) },
      { key: "owner", header: "담당", render: (row) => row.owner_name ?? "-" },
      { key: "status", header: "상태", render: (row) => <StatusBadge code={row.status} /> },
      {
        key: "edit",
        header: "작업",
        render: (row) => (
          <button
            className="pmo-btn"
            onClick={() => setForm({
              id: row.id,
              code: row.code,
              name: row.name,
              project_type: row.project_type,
              status: row.status,
              owner_name: row.owner_name ?? ""
            })}
          >
            수정
          </button>
        )
      }
    ],
    []
  );

  return (
    <AppShell currentPath={ROUTES.projectCodes} pageTitle="프로젝트코드">
      <div className="pmo-page-stack">
        <FilterBar actions={<button className="pmo-btn" onClick={() => void load()}>조회</button>}>
          <label className="pmo-field"><span>검색어</span><input value={q} onChange={(event) => setQ(event.target.value)} placeholder="코드/프로젝트명" /></label>
          <label className="pmo-field"><span>상태</span><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">전체</option>{PROJECT_STATUSES.map((option) => <option value={option.code} key={option.code}>{option.label}</option>)}</select></label>
        </FilterBar>
        <section className="pmo-filter-bar" aria-label="프로젝트코드 등록 수정">
          <div className="pmo-filter-fields">
            <label className="pmo-field"><span>코드</span><input value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} placeholder="자동 부여" /></label>
            <label className="pmo-field"><span>프로젝트명</span><input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
            <label className="pmo-field"><span>담당</span><input value={form.owner_name} onChange={(event) => setForm({ ...form, owner_name: event.target.value })} /></label>
            <label className="pmo-field"><span>사업유형</span><select value={form.project_type} onChange={(event) => setForm({ ...form, project_type: event.target.value as ProjectTypeCode })}>{PROJECT_TYPES.map((option) => <option value={option.code} key={option.code}>{option.label}</option>)}</select></label>
            <label className="pmo-field"><span>상태</span><select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as ProjectStatusCode })}>{PROJECT_STATUSES.map((option) => <option value={option.code} key={option.code}>{option.label}</option>)}</select></label>
          </div>
          <div className="pmo-filter-actions">
            <button className="pmo-btn" onClick={() => void save()}>{form.id ? "수정 저장" : "신규 등록"}</button>
            {form.id ? <button className="pmo-btn" onClick={() => setForm(emptyForm)}>취소</button> : null}
          </div>
        </section>
        {error ? <div className="pmo-panel pmo-error">{error}</div> : null}
        <BaseTable columns={columns} rows={rows} />
        <Pagination page={meta.page} pageSize={meta.page_size} total={meta.total} />
      </div>
    </AppShell>
  );
}
