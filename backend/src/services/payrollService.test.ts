import { calculateSalary, daysInMonth } from "./payrollService";

const settings = {
  pfEmployeeRate: 0.12,
  pfWageCeiling: 15000,
  esiEmployeeRate: 0.0075,
  esiWageCeiling: 21000,
  lwfAmount: 20,
  otMultiplier: 2,
} as any;

describe("calculateSalary", () => {
  it("computes full attendance with no OT/arrears", () => {
    const employee = { basicSalary: 15000, hra: 3000, conveyance: 1000 } as any;
    const total = daysInMonth(6, 2026); // June 2026 -> 30 days
    const attendance = Array.from({ length: total }, (_, i) => ({
      date: new Date(2026, 5, i + 1),
      status: "PRESENT" as const,
      otHours: 0,
    }));

    const result = calculateSalary(employee, 6, 2026, attendance, settings);

    expect(result.payableDays).toBe(30);
    expect(result.earnedBasic).toBe(15000);
    expect(result.earnedHra).toBe(3000);
    expect(result.earnedConveyance).toBe(1000);
    expect(result.grossPay).toBe(19000);
    expect(result.pfDeduction).toBe(1800); // min(15000, 15000) * 0.12
    expect(result.esiDeduction).toBe(142.5); // 19000 * 0.0075
    expect(result.lwfDeduction).toBe(20);
    expect(result.netPay).toBe(19000 - 1800 - 142.5 - 20);
  });

  it("prorates pay for partial attendance and unmarked days", () => {
    const employee = { basicSalary: 15000, hra: 3000, conveyance: 1000 } as any;
    const total = daysInMonth(2, 2026); // Feb 2026 -> 28 days
    const attendance = Array.from({ length: 20 }, (_, i) => ({
      date: new Date(2026, 1, i + 1),
      status: "PRESENT" as const,
      otHours: i === 0 ? 4 : 0,
    }));
    // remaining 8 days unmarked -> treated as absent, no payable days

    const result = calculateSalary(employee, 2, 2026, attendance, settings);

    expect(result.daysInMonth).toBe(28);
    expect(result.payableDays).toBe(20);
    expect(result.unmarkedDays).toBe(8);
    expect(result.earnedBasic).toBeCloseTo((15000 * 20) / 28, 2);
    expect(result.otHours).toBe(4);
  });

  it("skips ESI when gross exceeds the wage ceiling", () => {
    const employee = { basicSalary: 25000, hra: 5000, conveyance: 2000 } as any;
    const total = daysInMonth(6, 2026);
    const attendance = Array.from({ length: total }, (_, i) => ({
      date: new Date(2026, 5, i + 1),
      status: "PRESENT" as const,
      otHours: 0,
    }));

    const result = calculateSalary(employee, 6, 2026, attendance, settings);

    expect(result.grossPay).toBeGreaterThan(21000);
    expect(result.esiDeduction).toBe(0);
    expect(result.pfDeduction).toBe(1800); // capped at pfWageCeiling
  });
});
