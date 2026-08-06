import { Request, Response } from "express";
import { prisma } from "../prisma";
import { employeeSchema, employeeUpdateSchema } from "../utils/validation";
import { ApiError } from "../middleware/errorHandler";

export async function list(req: Request, res: Response) {
  const status = typeof req.query.status === "string" ? req.query.status : undefined;
  const employees = await prisma.employee.findMany({
    where: status ? { status: status as "ACTIVE" | "INACTIVE" } : undefined,
    include: { department: true },
    orderBy: { name: "asc" },
  });
  res.json(employees);
}

export async function get(req: Request, res: Response) {
  const employee = await prisma.employee.findUnique({
    where: { id: req.params.id },
    include: { department: true },
  });
  if (!employee) {
    throw new ApiError(404, "Employee not found");
  }
  res.json(employee);
}

export async function create(req: Request, res: Response) {
  const data = employeeSchema.parse(req.body);
  const existing = await prisma.employee.findUnique({
    where: { employeeCode: data.employeeCode },
  });
  if (existing) {
    throw new ApiError(400, "Employee code already exists");
  }
  const employee = await prisma.employee.create({
    data: {
      ...data,
      dateOfJoining: new Date(data.dateOfJoining),
      dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
    },
  });
  res.status(201).json(employee);
}

export async function update(req: Request, res: Response) {
  const data = employeeUpdateSchema.parse(req.body);
  const employee = await prisma.employee.update({
    where: { id: req.params.id },
    data: {
      ...data,
      dateOfJoining: data.dateOfJoining ? new Date(data.dateOfJoining) : undefined,
      dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
    },
  });
  res.json(employee);
}

export async function remove(req: Request, res: Response) {
  await prisma.employee.update({
    where: { id: req.params.id },
    data: { status: "INACTIVE" },
  });
  res.status(204).send();
}
