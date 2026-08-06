import { Request, Response } from "express";
import { prisma } from "../prisma";
import { settingsUpdateSchema } from "../utils/validation";

export async function get(_req: Request, res: Response) {
  const settings = await prisma.settings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });
  res.json(settings);
}

export async function update(req: Request, res: Response) {
  const data = settingsUpdateSchema.parse(req.body);
  const settings = await prisma.settings.upsert({
    where: { id: 1 },
    update: data,
    create: { id: 1, ...data },
  });
  res.json(settings);
}
