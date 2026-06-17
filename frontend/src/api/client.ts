import type { QRResponse, TokenResponse } from "./types";
import { QRResponseSchema, TokenResponseSchema } from "./types";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export class ResponseFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ResponseFormatError";
  }
}

// normalizeBase recorta las barras finales para que `${base}/api/...` nunca se duplique.
function normalizeBase(baseUrl: string): string {
  return baseUrl.trim().replace(/\/+$/, "");
}

// extractMessage extrae un error legible del cuerpo de la respuesta, tolerando
// tanto JSON como texto plano.
async function extractMessage(res: Response): Promise<string> {
  const text = await res.text();
  if (!text) return res.statusText || `HTTP ${res.status}`;
  try {
    const data = JSON.parse(text) as Record<string, unknown>;
    const msg = data.error ?? data.message;
    if (typeof msg === "string" && msg) return msg;
  } catch {
    // No es JSON; continuamos con el texto crudo.
  }
  return text;
}

// requestToken JWT (POST /api/v1/token).
export async function requestToken(
  baseUrl: string,
  username: string,
  password: string,
): Promise<TokenResponse> {
  const res = await fetch(`${normalizeBase(baseUrl)}/api/v1/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    throw new ApiError(res.status, await extractMessage(res));
  }
  // Validamos el body en runtime
  const parsed = TokenResponseSchema.safeParse(await res.json());
  if (!parsed.success) {
    throw new ResponseFormatError(
      "Respuesta del servidor con formato inesperado.",
    );
  }
  return parsed.data;
}

// computeQR envía la matriz al endpoint protegido (POST /api/v1/qr).
export async function computeQR(
  baseUrl: string,
  token: string,
  matrix: number[][],
): Promise<QRResponse> {
  const res = await fetch(`${normalizeBase(baseUrl)}/api/v1/qr`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ matrix }),
  });
  if (!res.ok) {
    throw new ApiError(res.status, await extractMessage(res));
  }
  // Validamos el body en runtime: una respuesta correcta pero malformada se
  // trata como ResponseFormatError, no como error de red.
  const parsed = QRResponseSchema.safeParse(await res.json());
  if (!parsed.success) {
    throw new ResponseFormatError(
      "Respuesta del servidor con formato inesperado.",
    );
  }
  return parsed.data;
}
