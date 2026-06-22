"use client";

import { useEffect, useRef, useState } from "react";

export type CommonPeriodPreset = "all" | "recent3m" | "thisMonth" | "lastMonth" | "thisYear" | "custom";

export function CommonPeriodPicker({
  value,
  from,
  to,
  onChange,
  onRangeChange,
  icon,
  zIndex = 40,
}: {
  value: CommonPeriodPreset;
  from: string;
  to: string;
  onChange: (value: CommonPeriodPreset) => void;
  onRangeChange: (next: { from?: string; to?: string }) => void;
  icon: React.ReactNode;
  zIndex?: number;
}) {
  const [presetOpen, setPresetOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const presets: Array<{ value: CommonPeriodPreset; label: string }> = [
    { value: "all", label: "전체" },
    { value: "recent3m", label: "최근 3개월" },
    { value: "thisMonth", label: "이번달" },
    { value: "lastMonth", label: "지난달" },
    { value: "thisYear", label: "올해" },
    { value: "custom", label: "직접 선택" },
  ];
  const selectedLabel = presets.find((preset) => preset.value === value)?.label ?? "전체";

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!rootRef.current) return;
      const target = event.target as Node | null;
      if (target && !rootRef.current.contains(target)) {
        setPresetOpen(false);
        setCalendarOpen(false);
      }
    };
    window.addEventListener("mousedown", handleClickOutside);
    return () => window.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const updateRange = (next: { from?: string; to?: string }) => {
    let nextFrom = next.from ?? from;
    let nextTo = next.to ?? to;
    if (nextFrom && nextTo && nextFrom > nextTo) {
      const temp = nextFrom;
      nextFrom = nextTo;
      nextTo = temp;
    }
    onRangeChange({ from: nextFrom, to: nextTo });
    if (value !== "custom") onChange("custom");
  };

  return (
    <div ref={rootRef} style={{ position: "relative" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 40px", gap: 0, border: "1px solid var(--line-2)", borderRadius: 8, background: "var(--bg-1)", overflow: "hidden" }}>
        <button
          type="button"
          onClick={() => {
            setPresetOpen((open) => !open);
            setCalendarOpen(false);
          }}
          style={{ height: 40, padding: "0 12px", border: 0, borderRight: "1px solid var(--line-2)", background: "transparent", fontSize: 14, fontWeight: 700, color: "var(--tx-2)", textAlign: "left", cursor: "pointer" }}
        >
          {selectedLabel}
          {value === "custom" && (from || to) ? ` (${from || "시작"} ~ ${to || "종료"})` : ""}
        </button>
        <button
          type="button"
          onClick={() => {
            setCalendarOpen((open) => !open);
            setPresetOpen(false);
          }}
          style={{ height: 40, border: 0, background: "transparent", color: "var(--tx-4)", display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
          aria-label="기간 달력 열기"
          title="기간 직접 선택"
        >
          {icon}
        </button>
      </div>

      {presetOpen ? (
        <div style={{ position: "absolute", left: 0, top: 44, zIndex, minWidth: "100%", padding: 6, border: "1px solid var(--line-2)", borderRadius: 8, background: "var(--bg-1)", boxShadow: "var(--sh-pop)" }}>
          {presets.map((preset) => (
            <button
              key={preset.value}
              type="button"
              onClick={() => {
                onChange(preset.value);
                setPresetOpen(false);
              }}
              style={{
                width: "100%",
                height: 32,
                padding: "0 10px",
                border: 0,
                borderRadius: 6,
                textAlign: "left",
                cursor: "pointer",
                background: value === preset.value ? "var(--brand-bg)" : "transparent",
                color: value === preset.value ? "var(--brand)" : "var(--tx-2)",
                fontSize: 13,
                fontWeight: value === preset.value ? 700 : 600,
              }}
            >
              {preset.label}
            </button>
          ))}
        </div>
      ) : null}

      {calendarOpen ? (
        <div style={{ position: "absolute", right: 0, top: 44, zIndex, width: 280, padding: 10, border: "1px solid var(--line-2)", borderRadius: 8, background: "var(--bg-1)", boxShadow: "var(--sh-pop)", display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontSize: 12, color: "var(--tx-4)", fontWeight: 600 }}>앞 날짜는 시작일, 뒤 날짜는 종료일로 자동 정렬됩니다.</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 6 }}>
            <input type="date" value={from} onChange={(e) => updateRange({ from: e.target.value })} style={{ height: 34, padding: "0 10px", border: "1px solid var(--line-2)", borderRadius: 6, fontSize: 13, color: "var(--tx-2)" }} />
            <input type="date" value={to} onChange={(e) => updateRange({ to: e.target.value })} style={{ height: 34, padding: "0 10px", border: "1px solid var(--line-2)", borderRadius: 6, fontSize: 13, color: "var(--tx-2)" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
            <button type="button" className="pmo-btn" style={{ height: 30, padding: "0 10px" }} onClick={() => { onRangeChange({ from: "", to: "" }); onChange("custom"); }}>초기화</button>
            <button type="button" className="pmo-btn pmo-btn-primary" style={{ height: 30, padding: "0 10px", background: "var(--brand)", borderColor: "var(--brand)", color: "#fff" }} onClick={() => setCalendarOpen(false)}>확인</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
