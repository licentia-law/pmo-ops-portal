export type SummaryCardProps = {
  label: string;
  value: string | number;
  unit?: string;
  note?: string;
};

export function SummaryCard({ label, value, unit, note }: SummaryCardProps) {
  return (
    <article className="pmo-summary-card">
      <span className="pmo-summary-label">{label}</span>
      <strong className="pmo-summary-value">{value}<small>{unit}</small></strong>
      {note ? <span className="pmo-summary-note">{note}</span> : null}
    </article>
  );
}
