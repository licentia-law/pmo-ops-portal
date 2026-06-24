type PersonnelWorkbookRow = {
  employeeNo?: string;
  name?: string;
  email?: string;
  groupName?: string;
  teamName?: string;
  positionName?: string;
  roleName?: string;
  employmentStatus?: string;
  mmStartDate?: string;
  mmEndDate?: string;
  yearlyMm?: string;
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

export async function downloadPersonnelWorkbook(rows: PersonnelWorkbookRow[], filenamePrefix: string, sheetName: string) {
  const headers = [
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
  const groupHeaders = [
    "인력 사번/성명", "",
    "기본 정보", "", "", "", "",
    "재직/MM 정보", "", "", "",
    "기타",
  ];
  const widthMaxByHeader: Record<string, number> = {
    "사번": 14,
    "성명": 12,
    "이메일": 28,
    "본부": 14,
    "팀": 14,
    "직위": 10,
    "역할": 10,
    "재직상태": 10,
    "MM 시작일": 12,
    "MM 종료일": 12,
    "연간 재직 MM": 16,
    "사용여부": 10,
  };
  const lines = rows.map((row) => ([
    row.employeeNo ?? "-",
    row.name ?? "-",
    row.email ?? "-",
    row.groupName ?? "-",
    row.teamName ?? "-",
    row.positionName ?? "-",
    row.roleName ?? "-",
    row.employmentStatus ?? "-",
    row.mmStartDate ?? "-",
    row.mmEndDate ?? "-",
    row.yearlyMm ?? "-",
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
  ws.mergeCells(1, 3, 1, 7);
  ws.mergeCells(1, 8, 1, 11);
  ws.mergeCells(1, 12, 1, 12);

  ws.eachRow((row) => {
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    });
  });

  const headerRow1 = ws.getRow(1);
  const headerRow2 = ws.getRow(2);
  const groupStyles: Array<{ start: number; end: number; color: string }> = [
    { start: 1, end: 2, color: "FFE6EAF0" },
    { start: 3, end: 7, color: "FFEAF0FA" },
    { start: 8, end: 11, color: "FFEAF7F2" },
    { start: 12, end: 12, color: "FFF7F2EA" },
  ];
  const columnStyleByIndex = new Map<number, string>();
  for (const group of groupStyles) {
    for (let col = group.start; col <= group.end; col += 1) {
      columnStyleByIndex.set(col, group.color);
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
  headerRow2.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    const fillColor = columnStyleByIndex.get(colNumber) ?? "FFEAF0FA";
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fillColor } };
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
