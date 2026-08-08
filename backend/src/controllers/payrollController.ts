import { Request, Response } from "express";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import { prisma } from "../prisma";
import { calculateSalary } from "../services/payrollService";
import {
  payrollGenerateQuerySchema,
  payrollUpdateSchema,
} from "../utils/validation";
import { ApiError } from "../middleware/errorHandler";

async function getSettings() {
  return prisma.settings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
}

export async function generate(req: Request, res: Response) {
  const { month, year } = payrollGenerateQuerySchema.parse(req.query);
  const [employees, settings] = await Promise.all([
    prisma.employee.findMany({ where: { status: "ACTIVE" } }),
    getSettings(),
  ]);

  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);

  const slips = [];
  for (const employee of employees) {
    const existing = await prisma.salarySlip.findUnique({
      where: { employeeId_month_year: { employeeId: employee.id, month, year } },
    });
    if (existing?.status === "FINALIZED") {
      slips.push(existing);
      continue;
    }

    const attendance = await prisma.attendanceRecord.findMany({
      where: { employeeId: employee.id, date: { gte: start, lt: end } },
    });

    const calc = calculateSalary(
      employee,
      month,
      year,
      attendance.map((a) => ({ date: a.date, status: a.status, otHours: Number(a.otHours) })),
      settings,
      existing ? Number(existing.arrears) : 0
    );

    const slip = await prisma.salarySlip.upsert({
      where: { employeeId_month_year: { employeeId: employee.id, month, year } },
      update: {
        daysInMonth: calc.daysInMonth,
        payableDays: calc.payableDays,
        otHours: calc.otHours,
        earnedBasic: calc.earnedBasic,
        earnedHra: calc.earnedHra,
        earnedConveyance: calc.earnedConveyance,
        otAmount: calc.otAmount,
        arrears: calc.arrears,
        grossPay: calc.grossPay,
        pfDeduction: calc.pfDeduction,
        esiDeduction: calc.esiDeduction,
        lwfDeduction: calc.lwfDeduction,
        totalDeductions: calc.totalDeductions,
        netPay: calc.netPay,
      },
      create: {
        employeeId: employee.id,
        month,
        year,
        daysInMonth: calc.daysInMonth,
        payableDays: calc.payableDays,
        otHours: calc.otHours,
        earnedBasic: calc.earnedBasic,
        earnedHra: calc.earnedHra,
        earnedConveyance: calc.earnedConveyance,
        otAmount: calc.otAmount,
        arrears: calc.arrears,
        grossPay: calc.grossPay,
        pfDeduction: calc.pfDeduction,
        esiDeduction: calc.esiDeduction,
        lwfDeduction: calc.lwfDeduction,
        totalDeductions: calc.totalDeductions,
        netPay: calc.netPay,
      },
    });
    slips.push(slip);
  }

  res.json(slips);
}

export async function list(req: Request, res: Response) {
  const { month, year } = payrollGenerateQuerySchema.parse(req.query);
  const slips = await prisma.salarySlip.findMany({
    where: { month, year },
    include: { employee: { include: { department: true } } },
    orderBy: { employee: { name: "asc" } },
  });
  res.json(slips);
}

async function recalculate(slipId: string, arrears?: number) {
  const slip = await prisma.salarySlip.findUnique({ where: { id: slipId }, include: { employee: true } });
  if (!slip) {
    throw new ApiError(404, "Salary slip not found");
  }
  if (slip.status === "FINALIZED") {
    throw new ApiError(400, "Cannot edit a finalized salary slip");
  }

  const settings = await getSettings();
  const start = new Date(slip.year, slip.month - 1, 1);
  const end = new Date(slip.year, slip.month, 1);
  const attendance = await prisma.attendanceRecord.findMany({
    where: { employeeId: slip.employeeId, date: { gte: start, lt: end } },
  });

  const calc = calculateSalary(
    slip.employee,
    slip.month,
    slip.year,
    attendance.map((a) => ({ date: a.date, status: a.status, otHours: Number(a.otHours) })),
    settings,
    arrears ?? Number(slip.arrears)
  );

  return prisma.salarySlip.update({
    where: { id: slipId },
    data: {
      daysInMonth: calc.daysInMonth,
      payableDays: calc.payableDays,
      otHours: calc.otHours,
      earnedBasic: calc.earnedBasic,
      earnedHra: calc.earnedHra,
      earnedConveyance: calc.earnedConveyance,
      otAmount: calc.otAmount,
      arrears: calc.arrears,
      grossPay: calc.grossPay,
      pfDeduction: calc.pfDeduction,
      esiDeduction: calc.esiDeduction,
      lwfDeduction: calc.lwfDeduction,
      totalDeductions: calc.totalDeductions,
      netPay: calc.netPay,
    },
  });
}

export async function update(req: Request, res: Response) {
  const { arrears } = payrollUpdateSchema.parse(req.body);
  const slip = await recalculate(req.params.id, arrears);
  res.json(slip);
}

export async function finalize(req: Request, res: Response) {
  const slip = await prisma.salarySlip.update({
    where: { id: req.params.id },
    data: { status: "FINALIZED" },
  });
  res.json(slip);
}

export async function exportExcel(req: Request, res: Response) {
  const { month, year } = payrollGenerateQuerySchema.parse(req.query);
  const slips = await prisma.salarySlip.findMany({
    where: { month, year },
    include: { employee: { include: { department: true } } },
    orderBy: { employee: { name: "asc" } },
  });

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Salary Sheet");

  sheet.columns = [
    { header: "S.NO", key: "sno", width: 6 },
    { header: "Emp Code", key: "code", width: 12 },
    { header: "NAME", key: "name", width: 24 },
    { header: "DEPTT.", key: "dept", width: 16 },
    { header: "BASIC", key: "basic", width: 10 },
    { header: "HRA", key: "hra", width: 10 },
    { header: "Conv", key: "conv", width: 10 },
    { header: "DAYS", key: "days", width: 8 },
    { header: "OT Hrs", key: "otHrs", width: 8 },
    { header: "E.BASIC", key: "ebasic", width: 10 },
    { header: "E.HRA", key: "ehra", width: 10 },
    { header: "E.CONV", key: "econv", width: 10 },
    { header: "OT", key: "ot", width: 10 },
    { header: "Arear", key: "arrears", width: 10 },
    { header: "GROSS", key: "gross", width: 12 },
    { header: "PF 12%", key: "pf", width: 10 },
    { header: "ESI 0.75%", key: "esi", width: 10 },
    { header: "LWF", key: "lwf", width: 8 },
    { header: "T.DED", key: "tded", width: 10 },
    { header: "NET PAY", key: "netpay", width: 12 },
  ];
  sheet.getRow(1).font = { bold: true };

  slips.forEach((slip, index) => {
    sheet.addRow({
      sno: index + 1,
      code: slip.employee.employeeCode,
      name: slip.employee.name,
      dept: slip.employee.department?.name ?? "",
      basic: Number(slip.employee.basicSalary),
      hra: Number(slip.employee.hra),
      conv: Number(slip.employee.conveyance),
      days: Number(slip.payableDays),
      otHrs: Number(slip.otHours),
      ebasic: Number(slip.earnedBasic),
      ehra: Number(slip.earnedHra),
      econv: Number(slip.earnedConveyance),
      ot: Number(slip.otAmount),
      arrears: Number(slip.arrears),
      gross: Number(slip.grossPay),
      pf: Number(slip.pfDeduction),
      esi: Number(slip.esiDeduction),
      lwf: Number(slip.lwfDeduction),
      tded: Number(slip.totalDeductions),
      netpay: Number(slip.netPay),
    });
  });

  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="salary-${year}-${month}.xlsx"`);
  await workbook.xlsx.write(res);
  res.end();
}

export async function exportPayslipPdf(req: Request, res: Response) {
  const slip = await prisma.salarySlip.findUnique({
    where: { id: req.params.id },
    include: { employee: { include: { department: true } } },
  });
  if (!slip) {
    throw new ApiError(404, "Salary slip not found");
  }

  const settings = await getSettings();

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="payslip-${slip.employee.employeeCode}-${slip.year}-${slip.month}.pdf"`
  );

  const doc = new PDFDocument({ margin: 40, size: "A4" });
  doc.pipe(res);

  const pageWidth = doc.page.width - 80;
  const centerX = doc.page.width / 2;
  let y = 40;

  // Colors
  const primaryColor = "#1e3a8a";
  const secondaryColor = "#3b82f6";
  const lightGray = "#f3f4f6";
  const darkGray = "#374151";
  const borderColor = "#d1d5db";

  // Helper functions
  const drawRect = (x: number, y: number, w: number, h: number, color: string = borderColor) => {
    doc.lineWidth(0.5).strokeColor(color).rect(x, y, w, h).stroke();
  };

  const fillRect = (x: number, y: number, w: number, h: number, color: string) => {
    doc.fillColor(color).rect(x, y, w, h).fill();
  };

  const drawLine = (x1: number, y1: number, x2: number, y2: number, color: string = borderColor) => {
    doc.lineWidth(0.5).strokeColor(color).moveTo(x1, y1).lineTo(x2, y2).stroke();
  };

  const formatCurrency = (val: any) => {
    const num = Number(val);
    return "₹" + num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // ===== HEADER SECTION =====
  // Company header background
  fillRect(40, y, pageWidth, 55, primaryColor);

  // Company name
  doc.fillColor("#ffffff").fontSize(22).font("Helvetica-Bold").text("YUG ENTERPRISES", 50, y + 10, { width: pageWidth - 20, align: "left" });

  // Payslip label
  doc.fontSize(11).font("Helvetica").text("SALARY SLIP", 50, y + 35, { width: pageWidth - 20, align: "left" });

  // Month/Year on right
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  doc.fontSize(14).font("Helvetica-Bold").text(`${monthNames[slip.month - 1]} ${slip.year}`, 40, y + 12, { width: pageWidth - 20, align: "right" });
  doc.fontSize(9).font("Helvetica").text("CONFIDENTIAL", 40, y + 30, { width: pageWidth - 20, align: "right" });

  y += 65;

  // ===== EMPLOYEE INFO SECTION =====
  const infoStartY = y;
  const boxHeight = 65;
  const leftBoxWidth = pageWidth * 0.55;
  const rightBoxWidth = pageWidth * 0.4;

  // Left box - Employee details
  drawRect(40, y, leftBoxWidth, boxHeight);
  fillRect(40, y, leftBoxWidth, 20, lightGray);

  doc.fillColor(darkGray).fontSize(9).font("Helvetica-Bold").text("EMPLOYEE DETAILS", 48, y + 4);

  doc.fontSize(9).font("Helvetica");
  doc.fillColor(darkGray).text("Name:", 48, y + 25);
  doc.font("Helvetica-Bold").text(slip.employee.name, 130, y + 25);

  doc.font("Helvetica").text("Employee Code:", 48, y + 38);
  doc.font("Helvetica-Bold").text(slip.employee.employeeCode, 130, y + 38);

  doc.font("Helvetica").text("Designation:", 48, y + 51);
  doc.font("Helvetica-Bold").text(slip.employee.department?.name ?? "—", 130, y + 51);

  // Right box - Pay period & Bank
  drawRect(40 + leftBoxWidth + 5, y, rightBoxWidth, boxHeight);
  fillRect(40 + leftBoxWidth + 5, y, rightBoxWidth, 20, lightGray);

  doc.fillColor(darkGray).fontSize(9).font("Helvetica-Bold").text("PAY PERIOD & BANK", 48 + leftBoxWidth + 5, y + 4);

  doc.fontSize(9).font("Helvetica");
  doc.fillColor(darkGray).text("Pay Month:", 48 + leftBoxWidth + 5, y + 25);
  doc.font("Helvetica-Bold").text(`${monthNames[slip.month - 1]} ${slip.year}`, 130 + leftBoxWidth + 5, y + 25);

  doc.font("Helvetica").text("Days in Month:", 48 + leftBoxWidth + 5, y + 38);
  doc.font("Helvetica-Bold").text(`${slip.daysInMonth}`, 130 + leftBoxWidth + 5, y + 38);

  doc.font("Helvetica").text("Days Payable:", 48 + leftBoxWidth + 5, y + 51);
  doc.font("Helvetica-Bold").text(`${slip.payableDays}`, 130 + leftBoxWidth + 5, y + 51);

  y += boxHeight + 10;

  // ===== EARNINGS SECTION =====
  const sectionTitle = (title: string, yPos: number) => {
    fillRect(40, yPos, pageWidth, 22, secondaryColor);
    doc.fillColor("#ffffff").fontSize(11).font("Helvetica-Bold").text(title, 50, yPos + 4, { width: pageWidth - 20 });
    return yPos + 22;
  };

  const drawTable = (yPos: number, headers: string[], colWidths: number[], rows: (string | number)[][], isEarnings: boolean) => {
    const rowHeight = 22;
    let tableY = yPos;

    // Header row
    fillRect(40, tableY, pageWidth, rowHeight, lightGray);
    drawRect(40, tableY, pageWidth, rowHeight);

    let xPos = 40;
    doc.fillColor(darkGray).fontSize(9).font("Helvetica-Bold");
    headers.forEach((header, i) => {
      const align = i === 0 ? "left" : "right";
      doc.text(header, xPos + 5, tableY + 5, { width: colWidths[i] - 10, align });
      xPos += colWidths[i];
      if (i < headers.length - 1) drawLine(40 + colWidths.slice(0, i + 1).reduce((a, b) => a + b, 0), tableY, 40 + colWidths.slice(0, i + 1).reduce((a, b) => a + b, 0), tableY + rowHeight);
    });

    tableY += rowHeight;

    // Data rows
    rows.forEach((row, rowIndex) => {
      const bgColor = rowIndex % 2 === 0 ? "#ffffff" : lightGray;
      fillRect(40, tableY, pageWidth, rowHeight, bgColor);
      drawRect(40, tableY, pageWidth, rowHeight);

      xPos = 40;
      doc.fillColor(darkGray).fontSize(9).font(rowIndex === rows.length - 1 ? "Helvetica-Bold" : "Helvetica");
      row.forEach((cell, i) => {
        const align = i === 0 ? "left" : "right";
        const val = typeof cell === "number" ? formatCurrency(cell) : cell;
        doc.text(val, xPos + 5, tableY + 5, { width: colWidths[i] - 10, align });
        xPos += colWidths[i];
        if (i < row.length - 1) drawLine(40 + colWidths.slice(0, i + 1).reduce((a, b) => a + b, 0), tableY, 40 + colWidths.slice(0, i + 1).reduce((a, b) => a + b, 0), tableY + rowHeight);
      });
      tableY += rowHeight;
    });

    // Outer border
    drawRect(40, yPos, pageWidth, tableY - yPos);
    return tableY;
  };

  // Earnings table
  y = sectionTitle("EARNINGS", y);
  const earnColWidths = [pageWidth * 0.55, pageWidth * 0.15, pageWidth * 0.15, pageWidth * 0.15];
  const earnHeaders = ["Component", "Rate (₹)", "Days/Hrs", "Amount (₹)"];
  const earnRows = [
    ["Basic Salary", Number(slip.employee.basicSalary), slip.payableDays, Number(slip.earnedBasic)],
    ["House Rent Allowance (HRA)", Number(slip.employee.hra), slip.payableDays, Number(slip.earnedHra)],
    ["Conveyance Allowance", Number(slip.employee.conveyance), slip.payableDays, Number(slip.earnedConveyance)],
    ["Overtime", "", Number(slip.otHours), Number(slip.otAmount)],
    ["Arrears", "", "", Number(slip.arrears)],
    ["GROSS EARNINGS", "", "", Number(slip.grossPay)],
  ];
  y = drawTable(y, earnHeaders, earnColWidths, earnRows, true) + 10;

  // Deductions table
  y = sectionTitle("DEDUCTIONS", y);
  const dedColWidths = [pageWidth * 0.55, pageWidth * 0.15, pageWidth * 0.15, pageWidth * 0.15];
  const dedHeaders = ["Component", "Rate (%)", "Wage Base", "Amount (₹)"];
  const pfRate = (Number(settings.pfEmployeeRate) * 100).toFixed(2);
  const esiRate = (Number(settings.esiEmployeeRate) * 100).toFixed(2);
  const pfCeiling = Number(settings.pfWageCeiling);
  const esiCeiling = Number(settings.esiWageCeiling);
  const pfBase = Math.min(Number(slip.grossPay), pfCeiling);
  const esiBase = Math.min(Number(slip.grossPay), esiCeiling);
  const dedRows = [
    ["Provident Fund (PF)", pfRate + "%", pfBase, Number(slip.pfDeduction)],
    ["Employee State Insurance (ESI)", esiRate + "%", esiBase, Number(slip.esiDeduction)],
    ["Labour Welfare Fund (LWF)", "Fixed", "", Number(slip.lwfDeduction)],
    ["TOTAL DEDUCTIONS", "", "", Number(slip.totalDeductions)],
  ];
  y = drawTable(y, dedHeaders, dedColWidths, dedRows, false) + 10;

  // ===== NET PAY SECTION =====
  const netPayBoxHeight = 50;
  fillRect(40, y, pageWidth, netPayBoxHeight, primaryColor);

  doc.fillColor("#ffffff").fontSize(12).font("Helvetica-Bold").text("NET PAY", 50, y + 8);
  doc.fontSize(26).font("Helvetica-Bold").text(formatCurrency(slip.netPay), 50, y + 28);

  // Net pay in words
  const numberToWords = (num: number) => {
    const a = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
    const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
    const c = ["", "Thousand", "Lakh", "Crore"];
    if (num === 0) return "Zero";
    let str = "";
    let i = 0;
    while (num > 0) {
      if (i === 0) {
        if (num % 100 < 20) str = a[num % 100] + " " + str;
        else str = b[Math.floor((num % 100) / 10)] + " " + a[(num % 100) % 10] + " " + str;
        num = Math.floor(num / 100);
      } else {
        if (num % 100 !== 0) str = a[num % 100] + " " + c[i] + " " + str;
        num = Math.floor(num / 100);
      }
      i++;
    }
    return str.trim() + " Rupees Only";
  };

  doc.fontSize(9).font("Helvetica").text(`Rupees ${numberToWords(Math.round(Number(slip.netPay)))}`, pageWidth * 0.4, y + 12, { width: pageWidth * 0.55, align: "right" });

  y += netPayBoxHeight + 15;

  // ===== FOOTER =====
  // Signature lines
  const sigY = y;
  doc.lineWidth(0.5).strokeColor(borderColor);
  doc.moveTo(50, sigY).lineTo(200, sigY).stroke();
  doc.moveTo(pageWidth - 150, sigY).lineTo(pageWidth + 30, sigY).stroke();

  doc.fillColor(darkGray).fontSize(9).font("Helvetica");
  doc.text("Authorized Signatory", 50, sigY + 5, { width: 150, align: "center" });
  doc.text("Employee Signature", pageWidth - 150, sigY + 5, { width: 150, align: "center" });

  // Disclaimer
  doc.fontSize(7).fillColor("#9ca3af").text(
    "This is a computer-generated payslip and does not require a physical signature. " +
    "Any discrepancies should be reported to HR/Finance department within 7 days.",
    40, sigY + 30, { width: pageWidth, align: "center" }
  );

  // Company details at bottom
  doc.fontSize(7).fillColor("#9ca3af").text(
    "YUG Enterprises  |  Payroll Management System  |  Generated on " + new Date().toLocaleDateString("en-IN"),
    40, sigY + 45, { width: pageWidth, align: "center" }
  );

  doc.end();
}
