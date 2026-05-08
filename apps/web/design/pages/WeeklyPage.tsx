import { ROUTES } from "@pmo/shared-types";
import { dashboardSummary } from "@pmo/shared-mocks";
import { AppShell, FilterBar, SummaryCard, TextFilter } from "@pmo/shared-ui";

export default function WeeklyPage() {
  return (
    <AppShell currentPath={ROUTES.reportsWeekly} pageTitle="주간현황">
      <div className="pmo-page-stack">
        <FilterBar actions={<button className="pmo-btn">조회</button>}>
          <TextFilter label="기준일" placeholder="YYYY-MM-DD" />
        </FilterBar>
        <section className="pmo-grid">
          <SummaryCard label="현재 인원" value={dashboardSummary.headcount} unit="명" />
          <SummaryCard label="수행" value={dashboardSummary.running} unit="명" />
          <SummaryCard label="제안" value={dashboardSummary.proposing} unit="명" />
          <SummaryCard label="대기" value={dashboardSummary.idle} unit="명" />
        </section>
      </div>
    </AppShell>
  );
}

