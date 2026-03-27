import { Request, Response } from "express";

export function healthHandler(_req: Request, res: Response): void {
  res.json({
    status: "ok",
    service: "colosseum-engine",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
}
