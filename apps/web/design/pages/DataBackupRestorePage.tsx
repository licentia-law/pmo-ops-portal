"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  applyDataBackupWorkbook,
  createDataBackup,
  getDataBackupDetail,
  getDataBackupOverview,
  getDevUserContext,
  restoreDataBackup,
  validateDataBackupWorkbook,
  type DataBackupDetail,
  type DataBackupOverview,
  type DataBackupValidationResult,
  type DevUserContext,
  type UserPermission,
} from "../../app/lib/api";
import { PmoShell } from "../components/PmoShell";
import LightweightLoading from "../components/LightweightLoading";
import { downloadDataBackupTemplate } from "./dataBackupWorkbookTemplate";

type IconName = "archive" | "download" | "upload" | "refresh" | "database" | "users" | "briefcase" | "link" | "clock" | "shield" | "eye";

const ICONS: Record<IconName, string> = {
  archive: "M4 7h16v3H4zM5 10h14v9a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2zM10 14h4",
  download: "M12 4v10M8 10l4 4 4-4M5 18h14",
  upload: "M12 20V10M8 14l4-4 4 4M5 6h14",
  refresh: "M20 12a8 8 0 1 1-2.34-5.66M20 4v6h-6",
  database: "M12 4c4.97 0 9 1.34 9 3s-4.03 3-9 3-9-1.34-9-3 4.03-3 9-3zm9 8c0 1.66-4.03 3-9 3s-9-1.34-9-3m18 4c0 1.66-4.03 3-9 3s-9-1.34-9-3",
  users: "M9 11.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zm7 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM2 20.5c0-3.5 3.1-6 7-6s7 2.5 7 6M16 14.5c3 .3 6 2.5 6 6",
  briefcase: "M3 7.5h18v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1zM8 7.5V5.5a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2",
  link: "M10 14l4-4M7 17H5a4 4 0 0 1 0-8h2M17 7h2a4 4 0 0 1 0 8h-2",
  clock: "M12 7v5l3 2M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z",
  shield: "M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z",
  eye: "M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
};

function Icon({ name, size = 18, stroke = 1.8, style }: { name: IconName; size?: number; stroke?: number; style?: CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" style={style} aria-hidden>
      <path d={ICONS[name]} />
    </svg>
  );
}

function formatNumber(value: number | null | undefined) {
  return Number(value ?? 0).toLocaleString("ko-KR");
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "-";
  return value.replace("T", " ").slice(0, 19);
}

function formatBytes(value: number | null | undefined) {
  const bytes = Number(value ?? 0);
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

function kindLabel(kind: string) {
  const labels: Record<string, string> = {
    manual_backup: "수동 백업",
    upload_before_backup: "업로드 전 백업",
    upload_complete: "업로드 완료",
    upload_failed: "업로드 실패",
    restore_before_backup: "복원 전 백업",
    restore_complete: "복원 완료",
    restore_failed: "복원 실패",
  };
  return labels[kind] ?? kind;
}

function SummaryCard({
  title,
  value,
  unit,
  icon,
  tone,
}: {
  title: string;
  value: string;
  unit: string;
  icon: IconName;
  tone: { bg: string; fg: string };
}) {
  return (
    <div className="pmo-panel" style={{ padding: "18px 18px 16px", minHeight: 112, display: "flex", gap: 14, alignItems: "center" }}>
      <span style={{ width: 52, height: 52, borderRadius: 16, background: tone.bg, color: tone.fg, display: "inline-flex", alignItems: "center", justifyContent: "center", flex: "0 0 auto" }}>
        <Icon name={icon} size={24} stroke={1.9} />
      </span>
      <span style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: "var(--tx-4)" }}>{title}</span>
        <span style={{ fontSize: 32, lineHeight: 1, fontWeight: 800, color: "var(--tx-1)" }}>{value}<span style={{ fontSize: 14, fontWeight: 700, color: "var(--tx-4)", marginLeft: 4 }}>{unit}</span></span>
      </span>
    </div>
  );
}

export default function DataBackupRestorePage() {
  const [permission, setPermission] = useState<UserPermission>("admin");
  const [userContext, setUserContext] = useState<DevUserContext | null>(null);
  const [overview, setOverview] = useState<DataBackupOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshToken, setRefreshToken] = useState(0);
  const [manualBackupMemo, setManualBackupMemo] = useState("");
  const [uploadMemo, setUploadMemo] = useState("");
  const [restoreMemo, setRestoreMemo] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validation, setValidation] = useState<DataBackupValidationResult | null>(null);
  const [selectedBackupId, setSelectedBackupId] = useState("");
  const [selectedBackupDetail, setSelectedBackupDetail] = useState<DataBackupDetail | null>(null);
  const [workingAction, setWorkingAction] = useState<"backup" | "validate" | "apply" | "restore" | "detail" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canAccess = permission === "admin";
  const backups = overview?.backups ?? [];
  const restoreHistory = overview?.restore_history ?? [];
  const uploadHistory = overview?.upload_history ?? [];

  useEffect(() => {
    const devUser = getDevUserContext();
    setUserContext(devUser);
    setPermission(devUser.permission);
  }, []);

  useEffect(() => {
    if (!canAccess) {
      setLoading(false);
      return;
    }
    let ignore = false;
    setLoading(true);
    setError(null);
    void getDataBackupOverview()
      .then((response) => {
        if (ignore) return;
        setOverview(response.data);
        if (!selectedBackupId && response.data.backups[0]?.backup_id) {
          setSelectedBackupId(response.data.backups[0].backup_id ?? "");
        }
      })
      .catch((nextError) => {
        if (ignore) return;
        setError(nextError instanceof Error ? nextError.message : "데이터를 불러오지 못했습니다.");
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [canAccess, refreshToken, selectedBackupId]);

  const summaryCards = useMemo(() => {
    const summary = overview?.summary;
    if (!summary) return [];
    return [
      { title: "프로젝트", value: formatNumber(summary.projects), unit: "건", icon: "briefcase" as const, tone: { bg: "#e8fbf2", fg: "#059669" } },
      { title: "인력", value: formatNumber(summary.personnel), unit: "명", icon: "users" as const, tone: { bg: "#f1ebff", fg: "#7c3aed" } },
      { title: "배정", value: formatNumber(summary.assignments), unit: "건", icon: "link" as const, tone: { bg: "#eef1ff", fg: "#4f46e5" } },
      { title: "월별 MM", value: formatNumber(summary.monthly_mm), unit: "건", icon: "database" as const, tone: { bg: "#e8faf5", fg: "#0f766e" } },
      { title: "스냅샷", value: formatNumber(summary.snapshots), unit: "건", icon: "clock" as const, tone: { bg: "#e8f0ff", fg: "#2563eb" } },
    ];
  }, [overview]);

  async function refreshOverview() {
    setRefreshToken((prev) => prev + 1);
  }

  async function handleCreateBackup() {
    setWorkingAction("backup");
    setError(null);
    try {
      await createDataBackup(manualBackupMemo || undefined);
      setManualBackupMemo("");
      await refreshOverview();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "백업 생성에 실패했습니다.");
    } finally {
      setWorkingAction(null);
    }
  }

  async function handleValidate() {
    if (!selectedFile) {
      setError("검증할 파일을 먼저 선택해 주세요.");
      return;
    }
    setWorkingAction("validate");
    setError(null);
    try {
      const response = await validateDataBackupWorkbook(selectedFile);
      setValidation(response.data);
    } catch (nextError) {
      setValidation(null);
      setError(nextError instanceof Error ? nextError.message : "검증에 실패했습니다.");
    } finally {
      setWorkingAction(null);
    }
  }

  async function handleApply() {
    if (!validation?.validation_id) {
      setError("먼저 검증을 실행해 주세요.");
      return;
    }
    if ((validation.summary.error_rows ?? 0) > 0) {
      setError("오류가 있는 검증 결과는 반영할 수 없습니다.");
      return;
    }
    if (!window.confirm("현재 개발 데이터 세트를 자동 백업 후 전체 교체합니다. 계속하시겠습니까?")) return;
    setWorkingAction("apply");
    setError(null);
    try {
      await applyDataBackupWorkbook(validation.validation_id, uploadMemo || undefined);
      setSelectedFile(null);
      setValidation(null);
      setUploadMemo("");
      await refreshOverview();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "전체 교체 반영에 실패했습니다.");
    } finally {
      setWorkingAction(null);
    }
  }

  async function handleSelectBackup(backupId: string) {
    setSelectedBackupId(backupId);
    if (!backupId) {
      setSelectedBackupDetail(null);
      return;
    }
    setWorkingAction("detail");
    setError(null);
    try {
      const response = await getDataBackupDetail(backupId);
      setSelectedBackupDetail(response.data);
    } catch (nextError) {
      setSelectedBackupDetail(null);
      setError(nextError instanceof Error ? nextError.message : "백업 상세를 불러오지 못했습니다.");
    } finally {
      setWorkingAction(null);
    }
  }

  async function handleRestore() {
    if (!selectedBackupId) {
      setError("복원할 백업을 선택해 주세요.");
      return;
    }
    if (!window.confirm("현재 데이터는 복원 전 자동 백업되며, 선택한 백업 세트로 전체 복원됩니다.")) return;
    setWorkingAction("restore");
    setError(null);
    try {
      await restoreDataBackup(selectedBackupId, restoreMemo || undefined);
      setRestoreMemo("");
      await refreshOverview();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "복원에 실패했습니다.");
    } finally {
      setWorkingAction(null);
    }
  }

  return (
    <PmoShell
      user={{ name: userContext?.name ?? "관리자", team: userContext?.team ?? "PMO본부", role: userContext?.role ?? "관리자", permission }}
      notifications={3}
      currentId="admin-data-backup"
      pageTitle="데이터 백업/업로드/복원"
    >
      {!canAccess ? (
        <section className="pmo-panel" style={{ padding: 24 }}>
          <h2 style={{ margin: "0 0 8px", fontSize: 20 }}>권한 없음</h2>
          <p style={{ margin: 0, color: "var(--tx-4)", fontWeight: 600 }}>관리자 권한이 있어야 데이터 백업/업로드/복원 화면에 접근할 수 있습니다.</p>
        </section>
      ) : loading ? (
        <LightweightLoading label="데이터 백업/업로드/복원 화면" />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <section className="pmo-panel" style={{ padding: 20, border: "1px solid #fed7aa", background: "linear-gradient(180deg, #fffaf2 0%, #ffffff 100%)" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
              <span style={{ width: 44, height: 44, borderRadius: 14, background: "#fff3e2", color: "#ea580c", display: "inline-flex", alignItems: "center", justifyContent: "center", flex: "0 0 auto" }}>
                <Icon name="shield" size={22} />
              </span>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <strong style={{ fontSize: 18, color: "#9a3412" }}>이 화면은 개발/테스트용 통합 데이터 운영 기능입니다.</strong>
                <span style={{ color: "#7c2d12", fontWeight: 600, lineHeight: 1.6 }}>
                  프로젝트, 인력, 배정, 월별 MM, 스냅샷, KPI 데이터가 함께 교체되거나 복원됩니다.
                  업로드 전 검증을 먼저 수행하고, 전체 교체/복원 전 현재 데이터는 자동 백업됩니다.
                </span>
              </div>
            </div>
          </section>

          <section style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 14 }}>
            {summaryCards.map((card) => (
              <SummaryCard key={card.title} {...card} />
            ))}
          </section>

          {error ? <section className="pmo-panel" style={{ padding: "12px 14px", color: "var(--crit)", fontWeight: 700 }}>{error}</section> : null}

          <section className="pmo-panel" style={{ padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 14 }}>
              <div>
                <h2 style={{ margin: "0 0 4px", fontSize: 20 }}>1. 데이터 백업</h2>
                <p style={{ margin: 0, color: "var(--tx-4)", fontWeight: 600 }}>현재 통합 데이터 세트를 JSON 백업 파일로 생성합니다.</p>
              </div>
              <button className="pmo-btn pmo-btn-primary" onClick={() => void handleCreateBackup()} disabled={workingAction === "backup"} style={{ background: "var(--brand)", borderColor: "var(--brand)", color: "#fff" }}>
                <Icon name="archive" size={16} style={{ marginRight: 6 }} />
                현재 데이터 백업
              </button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 260px", gap: 12, marginBottom: 16 }}>
              <input value={manualBackupMemo} onChange={(event) => setManualBackupMemo(event.target.value)} placeholder="백업 메모를 입력하세요." style={{ height: 40, borderRadius: 8, width: "100%" }} />
              <div className="pmo-panel" style={{ padding: "10px 12px", background: "var(--bg-2)", color: "var(--tx-3)", fontWeight: 700 }}>
                최근 백업 시각: {formatDateTime(overview?.summary.latest_backup_at)}
              </div>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table className="pmo-table">
                <thead>
                  <tr>
                    <th>생성일시</th>
                    <th>작업 유형</th>
                    <th>백업 ID</th>
                    <th>원본 파일명</th>
                    <th>작업자</th>
                    <th>상태</th>
                    <th>작업</th>
                  </tr>
                </thead>
                <tbody>
                  {backups.length === 0 ? (
                    <tr><td colSpan={7} style={{ textAlign: "center", color: "var(--tx-4)" }}>백업 이력이 없습니다.</td></tr>
                  ) : backups.map((record) => (
                    <tr key={record.id}>
                      <td>{formatDateTime(record.created_at)}</td>
                      <td>{kindLabel(record.kind)}</td>
                      <td>{record.backup_id ?? "-"}</td>
                      <td>{record.source_file_name ?? "-"}</td>
                      <td>{record.actor_name ?? "-"}</td>
                      <td>{record.status === "success" ? "성공" : "실패"}</td>
                      <td>
                        {record.backup_id ? (
                          <button className="pmo-btn pmo-btn-secondary" onClick={() => void handleSelectBackup(record.backup_id ?? "")}>
                            <Icon name="eye" size={14} style={{ marginRight: 6 }} />
                            상세
                          </button>
                        ) : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="pmo-panel" style={{ padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 14 }}>
              <div>
                <h2 style={{ margin: "0 0 4px", fontSize: 20 }}>2. 통합 엑셀 검증/업로드</h2>
                <p style={{ margin: 0, color: "var(--tx-4)", fontWeight: 600 }}>기존 프로젝트/인력 다운로드 양식 기반 템플릿으로 검증 후 전체 교체 반영합니다.</p>
              </div>
              <button className="pmo-btn pmo-btn-secondary" onClick={() => void downloadDataBackupTemplate()}>
                <Icon name="download" size={16} style={{ marginRight: 6 }} />
                통합 엑셀 템플릿 다운로드
              </button>
            </div>
            <div className="pmo-panel" style={{ padding: 18, borderStyle: "dashed", background: "var(--bg-2)", marginBottom: 14 }}>
              <div style={{ display: "flex", gap: 12, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <strong style={{ fontSize: 16 }}>업로드 파일 선택</strong>
                  <span style={{ color: "var(--tx-4)", fontWeight: 600 }}>{selectedFile ? `${selectedFile.name} (${formatBytes(selectedFile.size)})` : "선택된 파일이 없습니다. xlsx, 20MB 이하"}</span>
                </div>
                <label className="pmo-btn pmo-btn-secondary" style={{ cursor: "pointer" }}>
                  <Icon name="upload" size={16} style={{ marginRight: 6 }} />
                  파일 선택
                  <input
                    type="file"
                    accept=".xlsx"
                    style={{ display: "none" }}
                    onChange={(event) => {
                      const file = event.target.files?.[0] ?? null;
                      setSelectedFile(file);
                      setValidation(null);
                    }}
                  />
                </label>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto auto", gap: 12, alignItems: "center", marginBottom: 16 }}>
              <input value={uploadMemo} onChange={(event) => setUploadMemo(event.target.value)} placeholder="반영 메모를 입력하세요." style={{ height: 40, borderRadius: 8, width: "100%" }} />
              <button className="pmo-btn pmo-btn-secondary" onClick={() => void handleValidate()} disabled={!selectedFile || workingAction === "validate"}>검증 실행</button>
              <button className="pmo-btn pmo-btn-primary" onClick={() => void handleApply()} disabled={!validation || (validation.summary.error_rows ?? 0) > 0 || workingAction === "apply"} style={{ background: "var(--brand)", borderColor: "var(--brand)", color: "#fff" }}>
                전체 교체 반영
              </button>
            </div>
            {validation ? (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(6, minmax(0, 1fr))", gap: 12, marginBottom: 14 }}>
                  <SummaryCard title="시트 수" value={formatNumber(validation.summary.sheet_count)} unit="개" icon="database" tone={{ bg: "#eef1ff", fg: "#4f46e5" }} />
                  <SummaryCard title="전체 행" value={formatNumber(validation.summary.total_rows)} unit="행" icon="archive" tone={{ bg: "#eaf3ff", fg: "#2563eb" }} />
                  <SummaryCard title="정상 행" value={formatNumber(validation.summary.valid_rows)} unit="행" icon="shield" tone={{ bg: "#e8fbf2", fg: "#059669" }} />
                  <SummaryCard title="오류 행" value={formatNumber(validation.summary.error_rows)} unit="행" icon="upload" tone={{ bg: "#fff1f2", fg: "#dc2626" }} />
                  <SummaryCard title="경고 행" value={formatNumber(validation.summary.warning_rows)} unit="행" icon="clock" tone={{ bg: "#fff7ed", fg: "#ea580c" }} />
                  <SummaryCard title="검증 ID" value={validation.validation_id.slice(-8)} unit="" icon="eye" tone={{ bg: "#f5f3ff", fg: "#6d28d9" }} />
                </div>
                <div className="pmo-panel" style={{ padding: "12px 14px", background: "var(--bg-2)", marginBottom: 14, fontWeight: 700, color: "var(--tx-3)" }}>
                  예상 반영 건수: 프로젝트코드 {formatNumber(validation.summary.expected_counts.project_codes)}건 · 프로젝트 {formatNumber(validation.summary.expected_counts.projects)}건 · 인력 {formatNumber(validation.summary.expected_counts.personnel)}건 · 배정 {formatNumber(validation.summary.expected_counts.project_assignments)}건
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table className="pmo-table">
                    <thead>
                      <tr>
                        <th>시트</th>
                        <th>행 번호</th>
                        <th>컬럼</th>
                        <th>입력값</th>
                        <th>구분</th>
                        <th>메시지</th>
                      </tr>
                    </thead>
                    <tbody>
                      {validation.issues.length === 0 ? (
                        <tr><td colSpan={6} style={{ textAlign: "center", color: "var(--tx-4)" }}>오류/경고가 없습니다.</td></tr>
                      ) : validation.issues.map((issue, index) => (
                        <tr key={`${issue.sheet}-${issue.row_number}-${issue.column}-${index}`}>
                          <td>{issue.sheet}</td>
                          <td>{issue.row_number || "-"}</td>
                          <td>{issue.column}</td>
                          <td>{issue.input_value || "-"}</td>
                          <td style={{ color: issue.level === "error" ? "var(--crit)" : "#ea580c", fontWeight: 800 }}>{issue.level === "error" ? "오류" : "경고"}</td>
                          <td>{issue.message}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : null}
            {uploadHistory.length > 0 ? (
              <div style={{ marginTop: 18, overflowX: "auto" }}>
                <table className="pmo-table">
                  <thead>
                    <tr>
                      <th>생성일시</th>
                      <th>작업 유형</th>
                      <th>원본 파일명</th>
                      <th>상태</th>
                      <th>메모</th>
                    </tr>
                  </thead>
                  <tbody>
                    {uploadHistory.map((record) => (
                      <tr key={record.id}>
                        <td>{formatDateTime(record.created_at)}</td>
                        <td>{kindLabel(record.kind)}</td>
                        <td>{record.source_file_name ?? "-"}</td>
                        <td>{record.status === "success" ? "성공" : "실패"}</td>
                        <td>{record.memo ?? "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </section>

          <section className="pmo-panel" style={{ padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 14 }}>
              <div>
                <h2 style={{ margin: "0 0 4px", fontSize: 20 }}>3. 데이터 복원</h2>
                <p style={{ margin: 0, color: "var(--tx-4)", fontWeight: 600 }}>선택한 백업 세트로 현재 개발 데이터를 전체 복원합니다.</p>
              </div>
              <button className="pmo-btn pmo-btn-primary" onClick={() => void handleRestore()} disabled={!selectedBackupId || workingAction === "restore"} style={{ background: "var(--brand)", borderColor: "var(--brand)", color: "#fff" }}>
                <Icon name="refresh" size={16} style={{ marginRight: 6 }} />
                복원 시작
              </button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: selectedBackupDetail ? "minmax(0, 1fr) 340px" : "1fr", gap: 14 }}>
              <div>
                <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: 12, marginBottom: 12 }}>
                  <select value={selectedBackupId} onChange={(event) => void handleSelectBackup(event.target.value)} style={{ height: 40, borderRadius: 8 }}>
                    <option value="">복원할 백업 세트를 선택하세요.</option>
                    {backups.filter((record) => record.backup_id).map((record) => (
                      <option key={record.id} value={record.backup_id ?? ""}>{record.backup_id} · {formatDateTime(record.created_at)} · {kindLabel(record.kind)}</option>
                    ))}
                  </select>
                  <button className="pmo-btn pmo-btn-secondary" onClick={() => void handleSelectBackup(selectedBackupId)} disabled={!selectedBackupId || workingAction === "detail"}>상세 새로고침</button>
                </div>
                <input value={restoreMemo} onChange={(event) => setRestoreMemo(event.target.value)} placeholder="복원 메모를 입력하세요." style={{ height: 40, borderRadius: 8, width: "100%", marginBottom: 12 }} />
                <div style={{ overflowX: "auto" }}>
                  <table className="pmo-table">
                    <thead>
                      <tr>
                        <th>생성일시</th>
                        <th>작업 유형</th>
                        <th>source 백업</th>
                        <th>상태</th>
                        <th>비고</th>
                      </tr>
                    </thead>
                    <tbody>
                      {restoreHistory.length === 0 ? (
                        <tr><td colSpan={5} style={{ textAlign: "center", color: "var(--tx-4)" }}>복원 이력이 없습니다.</td></tr>
                      ) : restoreHistory.map((record) => (
                        <tr key={record.id}>
                          <td>{formatDateTime(record.created_at)}</td>
                          <td>{kindLabel(record.kind)}</td>
                          <td>{record.source_backup_id ?? record.backup_id ?? "-"}</td>
                          <td>{record.status === "success" ? "성공" : "실패"}</td>
                          <td>{record.message ?? record.memo ?? "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              {selectedBackupDetail ? (
                <aside className="pmo-panel" style={{ padding: 16, alignSelf: "start" }}>
                  <h3 style={{ margin: "0 0 12px", fontSize: 18 }}>백업 상세</h3>
                  <div style={{ display: "grid", gridTemplateColumns: "88px 1fr", gap: "8px 10px", fontSize: 14 }}>
                    <strong>백업 ID</strong><span>{selectedBackupDetail.backup_id}</span>
                    <strong>생성일시</strong><span>{formatDateTime(selectedBackupDetail.created_at)}</span>
                    <strong>작업자</strong><span>{selectedBackupDetail.actor_name ?? "-"}</span>
                    <strong>유형</strong><span>{kindLabel(selectedBackupDetail.kind)}</span>
                    <strong>파일</strong><span>{selectedBackupDetail.file_name}</span>
                    <strong>크기</strong><span>{formatBytes(selectedBackupDetail.file_size)}</span>
                    <strong>해시</strong><span style={{ wordBreak: "break-all" }}>{selectedBackupDetail.file_hash}</span>
                    <strong>메모</strong><span>{selectedBackupDetail.memo ?? "-"}</span>
                  </div>
                  <div style={{ marginTop: 14 }}>
                    <strong style={{ display: "block", marginBottom: 8 }}>포함 테이블</strong>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {selectedBackupDetail.included_tables.map((tableName) => (
                        <span key={tableName} style={{ display: "inline-flex", padding: "4px 8px", borderRadius: 999, background: "var(--bg-3)", border: "1px solid var(--line-2)", fontSize: 13, fontWeight: 700 }}>{tableName}</span>
                      ))}
                    </div>
                  </div>
                </aside>
              ) : null}
            </div>
          </section>
        </div>
      )}
    </PmoShell>
  );
}
