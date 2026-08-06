import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import * as clientService from "../services/client.service";

const clientSchema = z.object({
  date: z.string(),
  roomNo: z.string().min(1),
  guestName: z.string().min(1),
  checkIn: z.string(),
  checkOut: z.string(),
  nights: z.number().int().positive(),
  amountCash: z.number().nonnegative(),
  amountMomo: z.number().nonnegative(),
  remarks: z.string().nullable().optional(),
});

const updateClientSchema = clientSchema.partial();

export async function listClientsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const date = typeof req.query.date === "string" ? req.query.date : undefined;
    res.json(await clientService.listClients(req.user!, date));
  } catch (err) {
    next(err);
  }
}

export async function getClientHandler(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await clientService.getClient(req.user!, req.params.id));
  } catch (err) {
    next(err);
  }
}

export async function createClientHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const input = clientSchema.parse(req.body);
    res.status(201).json(await clientService.createClient(req.user!, input));
  } catch (err) {
    next(err);
  }
}

// Route-guarded to ADMIN only — workers have view-only access to entries.
export async function updateClientHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const input = updateClientSchema.parse(req.body);
    res.json(await clientService.updateClient(req.params.id, input));
  } catch (err) {
    next(err);
  }
}

export async function deleteClientHandler(req: Request, res: Response, next: NextFunction) {
  try {
    await clientService.deleteClient(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
