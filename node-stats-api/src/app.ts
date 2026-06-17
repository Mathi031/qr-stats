import express, {
  type Express,
  type NextFunction,
  type Request,
  type Response,
} from "express";

import { healthRouter } from "./routes/health.js";
import { statisticsRouter } from "./routes/statistics.js";
import { internalKeyMiddleware } from "./middleware/internalKey.js";

export function createApp(): Express {
  const app = express();

  app.use(express.json({ limit: "5mb" }));
  app.use("/health", healthRouter);
  app.use("/api/v1/statistics", internalKeyMiddleware, statisticsRouter);

  // Manejador de errores global: respeta un `status` estilo HttpError (default 500)
  // y emite una forma { error } consistente con la del servicio qr-api.
  app.use(
    (
      err: { status?: number; message?: string },
      _req: Request,
      res: Response,
      _next: NextFunction,
    ) => {
      const status = Number.isInteger(err.status)
        ? (err.status as number)
        : 500;
      res.status(status).json({ error: err.message });
    },
  );

  return app;
}
