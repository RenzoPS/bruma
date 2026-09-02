import { Router } from "express";
import { estadoDelProceso } from "../services/health.service.ts";

export const healthRouter = Router();

healthRouter.get("/healthz", (_req, res) => {
  res.json(estadoDelProceso());
});
