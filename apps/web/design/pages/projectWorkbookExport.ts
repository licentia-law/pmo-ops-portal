type ProjectWorkbookRow = {
  code?: string;
  name?: string;
  clientName?: string;
  projectType?: string;
  certainty?: string;
  amountText?: string;
  bidNoticeNo?: string;
  bidNoticeDate?: string;
  statusLabel?: string;
  salesDept?: string;
  salesOwner?: string;
  proposalPm?: string;
  presentPm?: string;
  deliveryPm?: string;
  proposalDeliveryTeam?: string;
  fromDate?: string;
  toDate?: string;
  proposalSubmissionAt?: string;
  submissionFormat?: string;
  submissionNote?: string;
  proposalPresentationAt?: string;
  presentationFormat?: string;
  presentationNote?: string;
  recentActivityAt?: string;
  useStatus?: string;
};

function fmtDateTimeForFile(date: Date) {
  const y = `${date.getFullYear()}`.slice(-2);
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  const hh = `${date.getHours()}`.padStart(2, "0");
  const mm = `${date.getMinutes()}`.padStart(2, "0");
  return `${y}${m}${d}_${hh}${mm}`;
}

function weightedTextWidth(text: string) {
  let width = 0;
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0;
    if (ch === " ") {
      width += 0.7;
      continue;
    }
    const isHangul = (code >= 0xac00 && code <= 0xd7a3) || (code >= 0x1100 && code <= 0x11ff) || (code >= 0x3130 && code <= 0x318f);
    const isFullWidth = (code >= 0x2e80 && code <= 0x9fff) || (code >= 0xff01 && code <= 0xff60) || (code >= 0xffe0 && code <= 0xffe6);
    if (isHangul || isFullWidth) {
      width += 2;
    } else if ((code >= 48 && code <= 57) || (code >= 65 && code <= 90) || (code >= 97 && code <= 122)) {
      width += 1;
    } else {
      width += 1.2;
    }
  }
  return width;
}

export async function downloadProjectWorkbook(rows: ProjectWorkbookRow[], filenamePrefix: string, sheetName: string) {
  const groupHeaders = [
    "프로젝트 코드/사업명", "",
    "프로젝트 기본정보", "", "", "", "", "", "",
    "인력 정보", "", "", "", "", "",
    "프로젝트 일정", "", "", "", "", "", "", "",
    "기타", "",
  ];
  const headers = [
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
  const widthMaxByHeader: Record<string, number> = {
    "코드": 14,
    "고객사": 14,
    "사업유형": 10,
    "확도": 8,
    "상태": 10,
    "사용여부": 10,
    "영업대표": 14,
    "제안PM": 14,
    "발표PM": 14,
    "수행PM": 14,
    "공고일": 12,
    "사업 시작일": 12,
    "사업 종료일": 12,
    "공고번호": 16,
  };
  const sortedRows = [...rows].sort((a, b) => String(b.code ?? "").localeCompare(String(a.code ?? ""), "ko-KR"));
  const lines = sortedRows.map((row) => ([
    row.code ?? "-",
    row.name ?? "-",
    row.clientName ?? "-",
    row.projectType ?? "-",
    row.certainty ?? "-",
    row.amountText ?? "-",
    row.bidNoticeNo ?? "-",
    row.bidNoticeDate ?? "-",
    row.statusLabel ?? "-",
    row.salesDept ?? "-",
    row.salesOwner ?? "-",
    row.proposalPm ?? "-",
    row.presentPm ?? "-",
    row.deliveryPm ?? "-",
    row.proposalDeliveryTeam ?? "-",
    row.fromDate ?? "-",
    row.toDate ?? "-",
    row.proposalSubmissionAt ?? "-",
    row.submissionFormat ?? "-",
    row.submissionNote ?? "-",
    row.proposalPresentationAt ?? "-",
    row.presentationFormat ?? "-",
    row.presentationNote ?? "-",
    row.recentActivityAt ?? "-",
    row.useStatus ?? "-",
  ]));

  const ExcelJS = await import("exceljs");
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(sheetName, {
    views: [{ state: "frozen", xSplit: 2, ySplit: 2 }],
  });
  ws.addRow(groupHeaders);
  ws.addRow(headers);
  lines.forEach((line) => ws.addRow(line));

  ws.mergeCells(1, 1, 1, 2);
  ws.mergeCells(1, 3, 1, 9);
  ws.mergeCells(1, 10, 1, 15);
  ws.mergeCells(1, 16, 1, 23);
  ws.mergeCells(1, 24, 1, 25);

  ws.eachRow((row) => {
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    });
  });

  const headerRow1 = ws.getRow(1);
  const headerRow2 = ws.getRow(2);
  const groupStyles: Array<{ start: number; end: number; color: string }> = [
    { start: 1, end: 2, color: "FFDEE3EB" },
    { start: 3, end: 9, color: "FFD3DCEC" },
    { start: 10, end: 15, color: "FFD8E8E3" },
    { start: 16, end: 23, color: "FFE6E1D5" },
    { start: 24, end: 25, color: "FFE0E3E8" },
  ];
  for (const group of groupStyles) {
    for (let col = group.start; col <= group.end; col += 1) {
      const cell = headerRow1.getCell(col);
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: group.color } };
      cell.font = { bold: true };
      cell.border = {
        top: { style: "thin", color: { argb: "FFFFFFFF" } },
        left: { style: "thin", color: { argb: "FFFFFFFF" } },
        right: { style: "thin", color: { argb: "FFFFFFFF" } },
        bottom: { style: "thin", color: { argb: "FFFFFFFF" } },
      };
    }
  }
  headerRow2.eachCell({ includeEmpty: true }, (cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEAF0FA" } };
    cell.font = { bold: true };
    cell.border = {
      top: { style: "thin", color: { argb: "FFFFFFFF" } },
      left: { style: "thin", color: { argb: "FFFFFFFF" } },
      right: { style: "thin", color: { argb: "FFFFFFFF" } },
      bottom: { style: "thin", color: { argb: "FFFFFFFF" } },
    };
  });

  for (let col = 1; col <= headers.length; col += 1) {
    let maxWidth = 0;
    ws.eachRow((row) => {
      const cell = row.getCell(col);
      const raw = cell.value == null ? "" : String(cell.value);
      const cellLines = raw.split(/\r?\n/);
      for (const line of cellLines) {
        const w = weightedTextWidth(line);
        if (w > maxWidth) maxWidth = w;
      }
    });
    const header = headers[col - 1] ?? "";
    const maxForCol = widthMaxByHeader[header] ?? 40;
    const minForCol = 8;
    ws.getColumn(col).width = Math.min(maxForCol, Math.max(minForCol, Math.ceil(maxWidth + 2)));
  }

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filenamePrefix}_${fmtDateTimeForFile(new Date())}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
