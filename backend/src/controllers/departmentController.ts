import { Request, Response } from "express";
import { prisma } from "../prisma";
import { departmentSchema } from "../utils/validation";
import { ApiError } from "../middleware/errorHandler";

export async function list(_req: Request, res: Response) {
  const departments = await prisma.department.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { employees: true } } },
  });
  res.json(departments);
}

export async function create(req: Request, res: Response) {
  const data = departmentSchema.parse(req.body);
  const department = await prisma.department.create({ data });
  res.status(201).json(department);
}

export async function update(req: Request, res: Response) {
  const data = departmentSchema.parse(req.body);
  const department = await prisma.department.update({
    where: { id: req.params.id },
    data,
  });
  res.json(department);
}

export async function remove(req: Request, res: Response) {
  const inUse = await prisma.employee.count({ where: { departmentId: req.params.id } });
  if (inUse > 0) {
    throw new ApiError(400, "Cannot delete a department that has employees assigned");
  }
  await prisma.department.delete({ where: { id: req.params.id } });
  res.status(204).send();
}
