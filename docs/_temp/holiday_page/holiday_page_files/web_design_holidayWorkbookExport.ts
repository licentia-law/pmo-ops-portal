type HolidayWorkbookRow = {
  holidayDate: string;
  weekdayLabel: string;
  name: string;
  holidayTypeLabel: string;
  repeatLabel: string;
  useStatusLabel: string;
  note: string;
};

function fmtDateTimeForFile(date: Date) {
  const y = `${date.getFullYear()}`.slice(-2);
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  const hh = `${date.getHours()}`.padStart(2, "0");
  const mm = `${date.getMinutes()}`.padStart(2, "0");
  return `${y}${m}${d}_${hh}${mm}`;
}

export async function downloadHolidayWorkbook(rows: HolidayWorkbookRow[], filenamePrefix: string, sheetName: string) {
  const ExcelJS = await import("exceljs");
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(sheetName, {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  const headers = ["날짜", "요일", "명칭", "구분", "반복여부", "사용여부", "비고"];
  ws.addRow(headers);
  rows.forEach((row) => ws.addRow([
    row.holidayDate,
    row.weekdayLabel,
    row.name,
    row.holidayTypeLabel,
    row.repeatLabel,
    row.useStatusLabel,
    row.note,
  ]));

  ws.getRow(1).eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEAF0FA" } };
    cell.font = { bold: true };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = {
      top: { style: "thin", color: { argb: "FFFFFFFF" } },
      left: { style: "thin", color: { argb: "FFFFFFFF" } },
      right: { style: "thin", color: { argb: "FFFFFFFF" } },
      bottom: { style: "thin", color: { argb: "FFFFFFFF" } },
    };
  });

  ws.columns = [
    { width: 14 },
    { width: 8 },
    { width: 24 },
    { width: 14 },
    { width: 12 },
    { width: 12 },
    { width: 32 },
  ];

  ws.eachRow((row, rowNumber) => {
    row.eachCell((cell) => {
      cell.alignment = { horizontal: rowNumber === 1 ? "center" : "left", vertical: "middle", wrapText: true };
    });
  });

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
