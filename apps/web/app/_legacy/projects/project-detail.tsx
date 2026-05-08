"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PROJECT_STATUSES, PROJECT_TYPES, ROUTES, labelFor, type ProjectStatusCode, type ProjectTypeCode } from "@pmo/shared-types";
import { AppShell, BaseTable, DetailPanel, StatusBadge, SummaryCard, type Column } from "@pmo/shared-ui";
import { getProject, listProjectLogs, updateProject, type ProjectLogRecord, type ProjectRecord } from "../../lib/api";
import { ALLOWED_STATUS_TRANSITIONS, canTransitionStatus } from "../../lib/projectRules";

type Props = { params: { projectId: string } };

export default function ProjectDetailPage({ params }: Props) {
  const [project, setProject] = useState<ProjectRecord | null>(null);
  const [logs, setLogs] = useState<ProjectLogRecord[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      const [projectResult, logsResult] = await Promise.all([
        getProject(params.projectId),
        listProjectLogs({ project_id: params.projectId, page: 1, page_size: 10, sort: "-logged_at" })
      ]);
      setProject(projectResult.data);
      setLogs(logsResult.data);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "조회에 실패했습니다.");
    }
  }

  useEffect(() => {
    void load();
  }, [params.projectId]);

  async function saveField(field: keyof ProjectRecord, value: string) {
    if (!project) return;
    await updateProject(project.id, { [field]: value || null });
    await load();
  }

  async function changeStatus(nextStatus: ProjectStatusCode) {
    if (!project) return;
    if (!canTransitionStatus(project.status, nextStatus)) {
      setError("허용되지 않는 상태 전환입니다.");
      return;
    }
    await updateProject(project.id, { status: nextStatus });
    await load();
  }

  const logColumns = useMemo<Column<ProjectLogRecord>[]>(
    () => [
      { key: "loggedAt", header: "일자", render: (row) => new Date(row.logged_at).toLocaleString("ko-KR") },
      { key: "author", header: "작성자", render: (row) => row.author_name ?? "-" },
      { key: "content", header: "내용", render: (row) => row.content },
      { key: "status", header: "상태", render: (row) => <StatusBadge code={row.status} /> }
    ],
    []
  );

  if (!project) {
    return (
      <AppShell currentPath={ROUTES.projectDetail(params.projectId)} pageTitle="프로젝트상세">
        <div className="pmo-panel">{error ?? "프로젝트를 불러오는 중입니다."}</div>
      </AppShell>
    );
  }

  return (
    <AppShell currentPath={ROUTES.projectDetail(params.projectId)} pageTitle="프로젝트상세">
      <div className="pmo-page-stack">
        <section className="pmo-grid">
          <SummaryCard label="프로젝트코드" value={project.code} />
          <SummaryCard label="사업유형" value={labelFor(PROJECT_TYPES, project.project_type)} />
          <SummaryCard label="PM" value={project.pm_name ?? "-"} />
          <SummaryCard label="상태" value="" note={labelFor(PROJECT_STATUSES, project.status)} />
        </section>
        {error ? <div className="pmo-panel pmo-error">{error}</div> : null}
        <div className="pmo-two-column">
          <div className="pmo-panel pmo-page-stack">
            <h1>{project.name}</h1>
            <div className="pmo-filter-fields">
              <label className="pmo-field"><span>사업명</span><input defaultValue={project.name} onBlur={(event) => void saveField("name", event.target.value)} /></label>
              <label className="pmo-field"><span>고객사</span><input defaultValue={project.client_name ?? ""} onBlur={(event) => void saveField("client_name", event.target.value)} /></label>
              <label className="pmo-field"><span>PM</span><input defaultValue={project.pm_name ?? ""} onBlur={(event) => void saveField("pm_name", event.target.value)} /></label>
              <label className="pmo-field"><span>시작일</span><input type="date" defaultValue={project.start_date ?? ""} onBlur={(event) => void saveField("start_date", event.target.value)} /></label>
              <label className="pmo-field"><span>완료일</span><input type="date" defaultValue={project.end_date ?? ""} onBlur={(event) => void saveField("end_date", event.target.value)} /></label>
              <label className="pmo-field">
                <span>사업유형</span>
                <select defaultValue={project.project_type} onChange={(event) => void saveField("project_type", event.target.value as ProjectTypeCode)}>
                  {PROJECT_TYPES.map((option) => <option value={option.code} key={option.code}>{option.label}</option>)}
                </select>
              </label>
            </div>
            <BaseTable columns={logColumns} rows={logs} />
          </div>
          <DetailPanel title="상세/액션" actions={<Link className="pmo-btn" href={ROUTES.projectOperations}>목록</Link>}>
            <div className="pmo-kv"><span>현재 상태</span><StatusBadge code={project.status} /></div>
            <label className="pmo-field">
              <span>상태 전환</span>
              <select
                value=""
                disabled={ALLOWED_STATUS_TRANSITIONS[project.status].length === 0}
                onChange={(event) => void changeStatus(event.target.value as ProjectStatusCode)}
              >
                <option value="">선택</option>
                {ALLOWED_STATUS_TRANSITIONS[project.status].map((code) => (
                  <option value={code} key={code}>{labelFor(PROJECT_STATUSES, code)}</option>
                ))}
              </select>
            </label>
            <div className="pmo-kv"><span>수정권한</span><strong>API 기준 적용</strong></div>
            <p>조회 전용은 저장이 차단되고, 프로젝트 담당 수정 가능 사용자는 발표완료 이후 본인 PM 프로젝트만 저장됩니다.</p>
          </DetailPanel>
        </div>
      </div>
    </AppShell>
  );
}
