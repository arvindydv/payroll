import { Request, Response } from "express";
import { prisma } from "../prisma";

export async function summary(_req: Request, res: Response) {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

  const [totalEmployees, presentToday, payrollThisMonth, pendingSlips] = await Promise.all([
    prisma.employee.count({ where: { status: "ACTIVE" } }),
    prisma.attendanceRecord.count({
      where: { date: { gte: todayStart, lt: todayEnd }, status: "PRESENT" },
    }),
    prisma.salarySlip.aggregate({
      where: { month, year },
      _sum: { netPay: true },
    }),
    prisma.salarySlip.count({ where: { month, year, status: "DRAFT" } }),
  ]);

  res.json({
    totalEmployees,
    presentToday,
    payrollThisMonth: payrollThisMonth._sum.netPay ?? 0,
    pendingSlips,
    month,
    year,
  });
}
