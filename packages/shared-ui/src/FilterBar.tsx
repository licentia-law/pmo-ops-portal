import type { ReactNode } from "react";

export type FilterBarProps = {
  children: ReactNode;
  actions?: ReactNode;
};

export function FilterBar({ children, actions }: FilterBarProps) {
  return (
    <section className="pmo-filter-bar" aria-label="필터">
      <div className="pmo-filter-fields">{children}</div>
      {actions ? <div className="pmo-filter-actions">{actions}</div> : null}
    </section>
  );
}

export function TextFilter({ label, placeholder }: { label: string; placeholder: string }) {
  return (
    <label className="pmo-field">
      <span>{label}</span>
      <input placeholder={placeholder} />
    </label>
  );
}

export function SelectFilter({ label, options }: { label: string; options: readonly { code: string; label: string }[] }) {
  return (
    <label className="pmo-field">
      <span>{label}</span>
      <select defaultValue="">
        <option value="">전체</option>
        {options.map((option) => (
          <option value={option.code} key={option.code}>{option.label}</option>
        ))}
      </select>
    </label>
  );
}
