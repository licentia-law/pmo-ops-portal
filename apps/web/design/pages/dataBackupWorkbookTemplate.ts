const PROJECT_GROUP_HEADERS = [
  "프로젝트 코드/사업명", "",
  "프로젝트 기본정보", "", "", "", "", "", "",
  "인력 정보", "", "", "", "", "",
  "프로젝트 일정", "", "", "", "", "", "", "",
  "기타", "",
];

const PROJECT_HEADERS = [
  "코드",
  "사업명",
  "고객사",
  "사업유형",
  "확도",
  "사업금액",
  "공고번호",
  "공고일",
  "상태",
  "영업부서",
  "영업대표",
  "제안PM",
  "발표PM",
  "수행PM",
  "제안/수행팀",
  "사업 시작일",
  "사업 종료일",
  "제안서 제출일",
  "제출 형식",
  "제출 유의사항",
  "제안 발표일",
  "발표 형식",
  "발표 유의사항",
  "최근 활동일",
  "사용여부",
];

const PERSONNEL_GROUP_HEADERS = [
  "인력 사번/성명", "",
  "기본 정보", "", "", "", "",
  "재직/MM 정보", "", "", "",
  "기타",
];

const PERSONNEL_HEADERS = [
  "사번",
  "성명",
  "이메일",
  "본부",
  "팀",
  "직위",
  "역할",
  "재직상태",
  "MM 시작일",
  "MM 종료일",
  "연간 재직 MM",
  "사용여부",
];

const ASSIGNMENT_HEADERS = [
  "배정키",
  "프로젝트코드",
  "사번",
  "배정유형",
  "프로젝트 역할",
  "배정상태",
  "WIN/LOSS",
  "상주유형",
  "대표여부",
  "순서",
  "시작일",
  "종료일",
  "MM",
  "총 MM",
  "현재 MM",
  "확도율",
  "단가",
  "비고",
];

function fmtDateTimeForFile(date: Date) {
  const y = `${date.getFullYear()}`.slice(-2);
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  const hh = `${date.getHours()}`.padStart(2, "0");
  const mm = `${date.getMinutes()}`.padStart(2, "0");
  return `${y}${m}${d}_${hh}${mm}`;
}

function decorateMergedHeader(ws: any, start: number, end: number, color: string) {
  for (let col = start; col <= end; col += 1) {
    const cell = ws.getRow(1).getCell(col);
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: color } };
    cell.font = { bold: true };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = {
      top: { style: "thin", color: { argb: "FFFFFFFF" } },
      left: { style: "thin", color: { argb: "FFFFFFFF" } },
      right: { style: "thin", color: { argb: "FFFFFFFF" } },
      bottom: { style: "thin", color: { argb: "FFFFFFFF" } },
    };
  }
}

function decorateHeaderRow(ws: any, rowNumber: number, color: string) {
  ws.getRow(rowNumber).eachCell({ includeEmpty: true }, (cell: any) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: color } };
    cell.font = { bold: true };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = {
      top: { style: "thin", color: { argb: "FFFFFFFF" } },
      left: { style: "thin", color: { argb: "FFFFFFFF" } },
      right: { style: "thin", color: { argb: "FFFFFFFF" } },
      bottom: { style: "thin", color: { argb: "FFFFFFFF" } },
    };
  });
}

export async function downloadDataBackupTemplate() {
  const ExcelJS = await import("exceljs");
  const wb = new ExcelJS.Workbook();

  const projectWs = wb.addWorksheet("프로젝트관리", { views: [{ state: "frozen", xSplit: 2, ySplit: 2 }] });
  projectWs.addRow(PROJECT_GROUP_HEADERS);
  projectWs.addRow(PROJECT_HEADERS);
  projectWs.mergeCells(1, 1, 1, 2);
  projectWs.mergeCells(1, 3, 1, 9);
  projectWs.mergeCells(1, 10, 1, 15);
  projectWs.mergeCells(1, 16, 1, 23);
  projectWs.mergeCells(1, 24, 1, 25);
  decorateMergedHeader(projectWs, 1, 2, "FFDEE3EB");
  decorateMergedHeader(projectWs, 3, 9, "FFD3DCEC");
  decorateMergedHeader(projectWs, 10, 15, "FFD8E8E3");
  decorateMergedHeader(projectWs, 16, 23, "FFE6E1D5");
  decorateMergedHeader(projectWs, 24, 25, "FFE0E3E8");
  decorateHeaderRow(projectWs, 2, "FFEAF0FA");
  PROJECT_HEADERS.forEach((header, index) => {
    projectWs.getColumn(index + 1).width = Math.max(header.length * 1.6, 12);
  });

  const personnelWs = wb.addWorksheet("인력관리", { views: [{ state: "frozen", xSplit: 2, ySplit: 2 }] });
  personnelWs.addRow(PERSONNEL_GROUP_HEADERS);
  personnelWs.addRow(PERSONNEL_HEADERS);
  personnelWs.mergeCells(1, 1, 1, 2);
  personnelWs.mergeCells(1, 3, 1, 7);
  personnelWs.mergeCells(1, 8, 1, 11);
  personnelWs.mergeCells(1, 12, 1, 12);
  decorateMergedHeader(personnelWs, 1, 2, "FFE6EAF0");
  decorateMergedHeader(personnelWs, 3, 7, "FFEAF0FA");
  decorateMergedHeader(personnelWs, 8, 11, "FFEAF7F2");
  decorateMergedHeader(personnelWs, 12, 12, "FFF7F2EA");
  decorateHeaderRow(personnelWs, 2, "FFEAF0FA");
  PERSONNEL_HEADERS.forEach((header, index) => {
    personnelWs.getColumn(index + 1).width = Math.max(header.length * 1.6, 12);
  });

  const assignmentWs = wb.addWorksheet("프로젝트배정", { views: [{ state: "frozen", ySplit: 1 }] });
  assignmentWs.addRow(ASSIGNMENT_HEADERS);
  decorateHeaderRow(assignmentWs, 1, "FFEAF0FA");
  ASSIGNMENT_HEADERS.forEach((header, index) => {
    assignmentWs.getColumn(index + 1).width = Math.max(header.length * 1.5, 12);
  });

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `통합_엑셀_템플릿_${fmtDateTimeForFile(new Date())}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
