"use client";

import { useEffect, useMemo, useState } from "react";
import { PROJECT_STATUSES, ROUTES, type ProjectStatusCode } from "@pmo/shared-types";
import { AppShell, BaseTable, DetailPanel, FilterBar, Pagination, StatusBadge, type Column } from "@pmo/shared-ui";
import { createProjectLog, getProjectLog, listProjectLogs, listProjects, type ProjectLogRecord, type ProjectRecord } from "../../lib/api";

export default function ProjectLogsPage() {
  const [rows, setRows] = useState<ProjectLogRecord[]>([]);
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [selected, setSelected] = useState<ProjectLogRecord | null>(null);
  const [meta, setMeta] = useState({ page: 1, page_size: 10, total: 0 });
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [projectId, setProjectId] = useState("");
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      const [logsResult, projectsResult] = await Promise.all([
        listProjectLogs({ q, status, page: 1, page_size: 10 }),
        listProjects({ page: 1, page_size: 100, sort: "code" })
      ]);
      setRows(logsResult.data);
      setProjects(projectsResult.data);
      setMeta({
        page: Number(logsResult.meta.page ?? 1),
        page_size: Number(logsResult.meta.page_size ?? 10),
        total: Number(logsResult.meta.total ?? 0)
      });
      if (!projectId && projectsResult.data[0]) {
        setProjectId(projectsResult.data[0].id);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "조회에 실패했습니다.");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function save() {
    const project = projects.find((item) => item.id === projectId);
    if (!project || !content.trim()) {
      setError("프로젝트와 내용을 입력해야 합니다.");
      return;
    }
    await createProjectLog({ project_id: project.id, status: project.status, content });
    setContent("");
    await load();
  }

  async function openDetail(logId: string) {
    const result = await getProjectLog(logId);
    setSelected(result.data);
  }

  const columns = useMemo<Column<ProjectLogRecord>[]>(
    () => [
      { key: "loggedAt", header: "진행일", render: (row) => new Date(row.logged_at).toLocaleString("ko-KR") },
      { key: "project", header: "프로젝트", render: (row) => `${row.project_code ?? "-"} ${row.project_name ?? ""}` },
      { key: "author", header: "작성자", render: (row) => row.author_name ?? "-" },
      { key: "content", header: "내용", render: (row) => row.content },
      { key: "status", header: "상태", render: (row) => <StatusBadge code={row.status} /> },
      { key: "detail", header: "작업", render: (row) => <button className="pmo-btn" onClick={() => void openDetail(row.id)}>상세</button> }
    ],
    []
  );

  return (
    <AppShell currentPath={ROUTES.projectLogs} pageTitle="진행이력">
      <div className="pmo-page-stack">
        <FilterBar actions={<button className="pmo-btn" onClick={() => void load()}>조회</button>}>
          <label className="pmo-field"><span>검색어</span><input value={q} onChange={(event) => setQ(event.target.value)} placeholder="프로젝트/내용/작성자" /></label>
          <label className="pmo-field"><span>상태</span><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">전체</option>{PROJECT_STATUSES.map((option) => <option value={option.code} key={option.code}>{option.label}</option>)}</select></label>
        </FilterBar>
        <section className="pmo-filter-bar" aria-label="진행이력 등록">
          <div className="pmo-filter-fields">
            <label className="pmo-field"><span>프로젝트</span><select value={projectId} onChange={(event) => setProjectId(event.target.value)}>{projects.map((project) => <option value={project.id} key={project.id}>{project.code} {project.name}</option>)}</select></label>
            <label className="pmo-field pmo-field-wide"><span>내용</span><input value={content} onChange={(event) => setContent(event.target.value)} placeholder="진행 메모" /></label>
          </div>
          <div className="pmo-filter-actions"><button className="pmo-btn" onClick={() => void save()}>이력 등록</button></div>
        </section>
        {error ? <div className="pmo-panel pmo-error">{error}</div> : null}
        <div className="pmo-two-column">
          <div>
            <BaseTable columns={columns} rows={rows} />
            <Pagination page={meta.page} pageSize={meta.page_size} total={meta.total} />
          </div>
          <DetailPanel title="선택 이력 상세">
            {selected ? (
              <>
                <div className="pmo-kv"><span>프로젝트</span><strong>{selected.project_name}</strong></div>
                <div className="pmo-kv"><span>상태</span><StatusBadge code={selected.status} /></div>
                <div className="pmo-kv"><span>작성자</span><strong>{selected.author_name ?? "-"}</strong></div>
                <p>{selected.content}</p>
              </>
            ) : <p>상세를 볼 이력을 선택하세요.</p>}
          </DetailPanel>
        </div>
      </div>
    </AppShell>
  );
}
