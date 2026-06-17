import type { NextFunction, Request, Response } from "express";

import { HttpError } from "../stats.js";

// Default solo para desarrollo. Debe coincidir con el INTERNAL_API_KEY de qr-api
// (ver docker-compose) para que la llamada interna funcione de entrada.
const DEV_INTERNAL_KEY = "dev-internal-key-change-me";

// rechaza toda petición cuya cabecera X-Internal-Key no coincida con INTERNAL_API_KEY
export function internalKeyMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const expected = process.env.INTERNAL_API_KEY || DEV_INTERNAL_KEY;
  const provided = req.get("X-Internal-Key");

  if (!provided || provided !== expected) {
    return next(
      new HttpError(
        401,
        "falta la clave interna (internal key) o no es valida",
      ),
    );
  }

  return next();
}
