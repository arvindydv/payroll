import { AttendanceStatus, Employee, Settings } from "@prisma/client";

export interface AttendanceInput {
  date: Date;
  status: AttendanceStatus;
  otHours: number;
}

export interface SalaryCalculationResult {
  daysInMonth: number;
  payableDays: number;
  unmarkedDays: number;
  otHours: number;
  earnedBasic: number;
  earnedHra: number;
  earnedConveyance: number;
  otAmount: number;
  arrears: number;
  grossPay: number;
  pfDeduction: number;
  esiDeduction: number;
  lwfDeduction: number;
  totalDeductions: number;
  netPay: number;
}

const PAYABLE_STATUSES: AttendanceStatus[] = [
  "PRESENT",
  "PAID_LEAVE",
  "WEEKLY_OFF",
  "HOLIDAY",
];

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function daysInMonth(month: number, year: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * Pure salary calculation, mirrors the columns of the original xlsx sheet:
 * E.BASIC / E.HRA / E.CONV / OT / Arear / GROSS / PF / ESI / LWF / T.DED / NET PAY
 */
export function calculateSalary(
  employee: Pick<Employee, "basicSalary" | "hra" | "conveyance">,
  month: number,
  year: number,
  attendance: AttendanceInput[],
  settings: Pick<
    Settings,
    | "pfEmployeeRate"
    | "pfWageCeiling"
    | "esiEmployeeRate"
    | "esiWageCeiling"
    | "lwfAmount"
    | "otMultiplier"
  >,
  arrears = 0
): SalaryCalculationResult {
  const totalDays = daysInMonth(month, year);
  const basic = Number(employee.basicSalary);
  const hra = Number(employee.hra);
  const conveyance = Number(employee.conveyance);

  const byDate = new Map<string, AttendanceInput>();
  for (const record of attendance) {
    byDate.set(record.date.toISOString().slice(0, 10), record);
  }

  let payableDays = 0;
  let unmarkedDays = 0;
  let totalOtHours = 0;

  for (let day = 1; day <= totalDays; day++) {
    const key = new Date(year, month - 1, day).toISOString().slice(0, 10);
    const record = byDate.get(key);
    if (!record) {
      unmarkedDays += 1;
      continue;
    }
    if (record.status === "HALF_DAY") {
      payableDays += 0.5;
    } else if (PAYABLE_STATUSES.includes(record.status)) {
      payableDays += 1;
    }
    totalOtHours += Number(record.otHours);
  }

  const proration = payableDays / totalDays;
  const earnedBasic = round2(basic * proration);
  const earnedHra = round2(hra * proration);
  const earnedConveyance = round2(conveyance * proration);

  const otMultiplier = Number(settings.otMultiplier);
  const perHourBasic = basic / totalDays / 8;
  const otAmount = round2(totalOtHours * perHourBasic * otMultiplier);

  const grossPay = round2(earnedBasic + earnedHra + earnedConveyance + otAmount + arrears);

  const pfWageCeiling = Number(settings.pfWageCeiling);
  const pfEmployeeRate = Number(settings.pfEmployeeRate);
  const pfDeduction = round2(Math.min(earnedBasic, pfWageCeiling) * pfEmployeeRate);

  const esiWageCeiling = Number(settings.esiWageCeiling);
  const esiEmployeeRate = Number(settings.esiEmployeeRate);
  const esiDeduction = grossPay <= esiWageCeiling ? round2(grossPay * esiEmployeeRate) : 0;

  const lwfDeduction = round2(Number(settings.lwfAmount));

  const totalDeductions = round2(pfDeduction + esiDeduction + lwfDeduction);
  const netPay = round2(grossPay - totalDeductions);

  return {
    daysInMonth: totalDays,
    payableDays,
    unmarkedDays,
    otHours: totalOtHours,
    earnedBasic,
    earnedHra,
    earnedConveyance,
    otAmount,
    arrears,
    grossPay,
    pfDeduction,
    esiDeduction,
    lwfDeduction,
    totalDeductions,
    netPay,
  };
}
