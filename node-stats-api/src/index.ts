import type { Server } from "node:http";

import { createApp } from "./app.js";

const PORT = process.env.PORT || 3000;

const app = createApp();

const server: Server = app.listen(PORT, () => {
  console.log(`stats-api listening on :${PORT}`);
});

// Apagado ordenado: deja de aceptar conexiones, drena las activas y sale.
// Si no cierra en 10s, fuerza la salida para no quedar colgado en el despliegue.
function shutdown(signal: string): void {
  console.log(`stats-api received ${signal}, shutting down...`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
