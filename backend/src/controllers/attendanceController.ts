import { Request, Response } from "express";
import { prisma } from "../prisma";
import { attendanceBulkSchema, payrollGenerateQuerySchema } from "../utils/validation";
import { daysInMonth } from "../services/payrollService";

export async function getMonthGrid(req: Request, res: Response) {
  const { month, year } = payrollGenerateQuerySchema.parse(req.query);
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);

  const [employees, records] = await Promise.all([
    prisma.employee.findMany({
      where: { status: "ACTIVE" },
      orderBy: { name: "asc" },
      select: { id: true, employeeCode: true, name: true },
    }),
    prisma.attendanceRecord.findMany({
      where: { date: { gte: start, lt: end } },
    }),
  ]);

  res.json({
    month,
    year,
    daysInMonth: daysInMonth(month, year),
    employees,
    records,
  });
}

export async function bulkUpsert(req: Request, res: Response) {
  const { records } = attendanceBulkSchema.parse(req.body);

  const results = await prisma.$transaction(
    records.map((record) =>
      prisma.attendanceRecord.upsert({
        where: {
          employeeId_date: {
            employeeId: record.employeeId,
            date: new Date(record.date),
          },
        },
        update: {
          status: record.status,
          otHours: record.otHours,
          notes: record.notes ?? undefined,
        },
        create: {
          employeeId: record.employeeId,
          date: new Date(record.date),
          status: record.status,
          otHours: record.otHours,
          notes: record.notes ?? undefined,
        },
      })
    )
  );

  res.json(results);
}
