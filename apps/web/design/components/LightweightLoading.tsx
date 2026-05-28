"use client";

export default function LightweightLoading({ label = "페이지" }: { label?: string }) {
  return (
    <div
      style={{
        minHeight: "42vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg-2)",
        color: "var(--tx-3)",
      }}
    >
      <div
        className="pmo-panel"
        style={{
          minWidth: 240,
          padding: "14px 18px",
          display: "inline-flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: "var(--brand)",
            boxShadow: "0 0 0 4px color-mix(in oklab, var(--brand) 20%, transparent)",
          }}
        />
        <span style={{ fontSize: 14, fontWeight: 600 }}>{label} 로딩 중...</span>
      </div>
    </div>
  );
}
