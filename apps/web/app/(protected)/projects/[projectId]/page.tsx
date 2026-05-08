import { PROJECT_TYPES, ROUTES, labelFor } from "@pmo/shared-types";
import { projectLogsMock, projectsMock } from "@pmo/shared-mocks";
import { AppShell, BaseTable, DetailPanel, StatusBadge, SummaryCard, type Column } from "@pmo/shared-ui";

const logColumns: Column<(typeof projectLogsMock)[number]>[] = [
  { key: "loggedAt", header: "일자", render: (row) => row.loggedAt },
  { key: "author", header: "작성자", render: (row) => row.authorName },
  { key: "content", header: "내용", render: (row) => row.content },
  { key: "status", header: "상태", render: (row) => <StatusBadge code={row.status} /> }
];

export default function ProjectDetailPage({ params }: { params: { projectId: string } }) {
  const project = projectsMock.find((item) => item.id === params.projectId) ?? projectsMock[0];
  return (
    <AppShell currentPath={ROUTES.projectDetail(params.projectId)} pageTitle="프로젝트상세">
      <div className="pmo-page-stack">
        <section className="pmo-grid">
          <SummaryCard label="프로젝트코드" value={project.code} />
          <SummaryCard label="사업유형" value={labelFor(PROJECT_TYPES, project.projectType)} />
          <SummaryCard label="PM" value={project.pmName} />
          <SummaryCard label="상태" value="" note="상태 배지는 상세 패널에서 표시" />
        </section>
        <div className="pmo-two-column">
          <div className="pmo-panel">
            <h1>{project.name}</h1>
            <p>고객사: {project.clientName}</p>
            <p>기간: {project.startDate} ~ {project.endDate}</p>
            <BaseTable columns={logColumns} rows={projectLogsMock.filter((log) => log.projectName === project.name)} />
          </div>
          <DetailPanel title="상세/액션">
            <div className="pmo-kv"><span>상태</span><StatusBadge code={project.status} /></div>
            <div className="pmo-kv"><span>수정권한</span><strong>TODO</strong></div>
            <p>TODO: 발표완료 이후 상세/투입기간 수정 권한은 해당 PM/제안팀 또는 관리자 기준으로 구현 필요.</p>
          </DetailPanel>
        </div>
      </div>
    </AppShell>
  );
}
