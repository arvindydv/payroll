import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const departmentSchema = z.object({
  name: z.string().min(1),
});

export const employeeSchema = z.object({
  employeeCode: z.string().min(1),
  name: z.string().min(1),
  fatherName: z.string().optional().nullable(),
  departmentId: z.string().uuid().optional().nullable(),
  dateOfJoining: z.string(),
  dateOfBirth: z.string().optional().nullable(),
  esiNumber: z.string().optional().nullable(),
  uanNumber: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  basicSalary: z.number().nonnegative(),
  hra: z.number().nonnegative().default(0),
  conveyance: z.number().nonnegative().default(0),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
});

export const employeeUpdateSchema = employeeSchema.partial();

export const attendanceStatusEnum = z.enum([
  "PRESENT",
  "ABSENT",
  "HALF_DAY",
  "PAID_LEAVE",
  "UNPAID_LEAVE",
  "WEEKLY_OFF",
  "HOLIDAY",
]);

export const attendanceBulkSchema = z.object({
  records: z
    .array(
      z.object({
        employeeId: z.string().uuid(),
        date: z.string(),
        status: attendanceStatusEnum,
        otHours: z.number().nonnegative().default(0),
        notes: z.string().optional().nullable(),
      })
    )
    .min(1),
});

export const payrollGenerateQuerySchema = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000).max(2100),
});

export const payrollUpdateSchema = z.object({
  arrears: z.number(),
});

export const settingsUpdateSchema = z.object({
  companyName: z.string().min(1).optional(),
  pfEmployeeRate: z.number().min(0).max(1).optional(),
  pfWageCeiling: z.number().nonnegative().optional(),
  esiEmployeeRate: z.number().min(0).max(1).optional(),
  esiWageCeiling: z.number().nonnegative().optional(),
  lwfAmount: z.number().nonnegative().optional(),
  otMultiplier: z.number().nonnegative().optional(),
});
