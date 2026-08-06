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

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="payslip-${slip.employee.employeeCode}-${slip.year}-${slip.month}.pdf"`
  );

  const doc = new PDFDocument({ margin: 50 });
  doc.pipe(res);

  doc.fontSize(16).text("YUG ENTERPRISES", { align: "center" });
  doc.fontSize(12).text(`Payslip - ${slip.month}/${slip.year}`, { align: "center" });
  doc.moveDown();

  doc.fontSize(10);
  doc.text(`Employee: ${slip.employee.name} (${slip.employee.employeeCode})`);
  doc.text(`Department: ${slip.employee.department?.name ?? "-"}`);
  doc.moveDown();

  const rows: [string, string][] = [
    ["Days Payable", `${slip.payableDays} / ${slip.daysInMonth}`],
    ["OT Hours", `${slip.otHours}`],
    ["Earned Basic", `${slip.earnedBasic}`],
    ["Earned HRA", `${slip.earnedHra}`],
    ["Earned Conveyance", `${slip.earnedConveyance}`],
    ["OT Amount", `${slip.otAmount}`],
    ["Arrears", `${slip.arrears}`],
    ["Gross Pay", `${slip.grossPay}`],
    ["PF Deduction", `${slip.pfDeduction}`],
    ["ESI Deduction", `${slip.esiDeduction}`],
    ["LWF Deduction", `${slip.lwfDeduction}`],
    ["Total Deductions", `${slip.totalDeductions}`],
    ["Net Pay", `${slip.netPay}`],
  ];

  for (const [label, value] of rows) {
    doc.text(`${label}: ${value}`);
  }

  doc.end();
}
