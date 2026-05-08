import { ROUTES } from "@pmo/shared-types";
import { dashboardSummary } from "@pmo/shared-mocks";
import { AppShell, FilterBar, SummaryCard, TextFilter } from "@pmo/shared-ui";

export default function MonthlyPage() {
  return (
    <AppShell currentPath={ROUTES.reportsMonthly} pageTitle="월별가동현황">
      <div className="pmo-page-stack">
        <FilterBar actions={<button className="pmo-btn">조회</button>}>
          <TextFilter label="기준월" placeholder="YYYY-MM" />
        </FilterBar>
        <section className="pmo-grid">
          <SummaryCard label="가동률" value={dashboardSummary.utilizationRate} unit="%" />
          <SummaryCard label="가득률" value={dashboardSummary.contractRate} unit="%" />
          <SummaryCard label="수행 MM" value={0} unit="MM" note="TODO: 월별 MM 집계 연결" />
          <SummaryCard label="제안 MM" value={0} unit="MM" note="TODO: 월별 MM 집계 연결" />
        </section>
      </div>
    </AppShell>
  );
}

