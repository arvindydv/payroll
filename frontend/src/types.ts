export type EmployeeStatus = "ACTIVE" | "INACTIVE";

export interface Department {
  id: string;
  name: string;
  _count?: { employees: number };
}

export interface Employee {
  id: string;
  employeeCode: string;
  name: string;
  fatherName?: string | null;
  departmentId?: string | null;
  department?: Department | null;
  dateOfJoining: string;
  dateOfBirth?: string | null;
  esiNumber?: string | null;
  uanNumber?: string | null;
  phone?: string | null;
  basicSalary: string | number;
  hra: string | number;
  conveyance: string | number;
  status: EmployeeStatus;
}

export type AttendanceStatus =
  | "PRESENT"
  | "ABSENT"
  | "HALF_DAY"
  | "PAID_LEAVE"
  | "UNPAID_LEAVE"
  | "WEEKLY_OFF"
  | "HOLIDAY";

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string;
  status: AttendanceStatus;
  otHours: string | number;
  notes?: string | null;
}

export interface AttendanceGrid {
  month: number;
  year: number;
  daysInMonth: number;
  employees: Pick<Employee, "id" | "employeeCode" | "name">[];
  records: AttendanceRecord[];
}

export interface SalarySlip {
  id: string;
  employeeId: string;
  employee?: Employee;
  month: number;
  year: number;
  daysInMonth: number;
  payableDays: string | number;
  otHours: string | number;
  earnedBasic: string | number;
  earnedHra: string | number;
  earnedConveyance: string | number;
  otAmount: string | number;
  arrears: string | number;
  grossPay: string | number;
  pfDeduction: string | number;
  esiDeduction: string | number;
  lwfDeduction: string | number;
  totalDeductions: string | number;
  netPay: string | number;
  status: "DRAFT" | "FINALIZED";
}

export interface Settings {
  id: number;
  companyName: string;
  pfEmployeeRate: string | number;
  pfWageCeiling: string | number;
  esiEmployeeRate: string | number;
  esiWageCeiling: string | number;
  lwfAmount: string | number;
  otMultiplier: string | number;
}

export interface DashboardSummary {
  totalEmployees: number;
  presentToday: number;
  payrollThisMonth: string | number;
  pendingSlips: number;
  month: number;
  year: number;
}
