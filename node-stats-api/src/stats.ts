import { z } from "zod";

// Tolerancia para las comparaciones de punto flotante
export const EPSILON = 1e-9;

export class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

// MatricesSchema valida el cuerpo de la petición de estadísticas: un objeto con
// `matrices`, array no vacío de matrices con nombre y datos rectangulares de
// números finitos. z.number() ya rechaza NaN e Infinity, así que cubre el caso
// "número finito" sin comprobaciones extra.
const MatrixDataSchema = z
  .array(z.array(z.number()).min(1))
  .min(1)
  .refine((data) => data.every((row) => row.length === data[0].length), {
    error: "jagged",
  });

const MatrixSchema = z.object({
  name: z.string().min(1),
  data: MatrixDataSchema,
});

const MatricesSchema = z.object({
  matrices: z.array(MatrixSchema).min(1),
});

export type MatrixInput = z.infer<typeof MatrixSchema>;

export interface MatrixStats {
  max: number;
  min: number;
  average: number;
  sum: number;
  isDiagonal: boolean;
}

export interface AggregateStats {
  max: number;
  min: number;
  average: number;
  sum: number;
}

export interface Statistics {
  perMatrix: Record<string, MatrixStats>;
  aggregate: AggregateStats;
  anyDiagonal: boolean;
}

// formatPath traduce la ruta de un issue de zod (p. ej. ["matrices", 0, "data",
// 1, 0]) al estilo de índices usado en los mensajes: matrices[0].data[1][0].
function formatPath(path: PropertyKey[]): string {
  let result = "";
  for (const segment of path) {
    if (typeof segment === "number") {
      result += `[${segment}]`;
    } else {
      result += result === "" ? String(segment) : `.${String(segment)}`;
    }
  }
  return result;
}

function describeIssue(issue: z.core.$ZodIssue): string {
  const where = formatPath(issue.path);

  // El refine de filas irregulares marca el error con el mensaje "jagged".
  if (issue.code === "custom" && issue.message === "jagged") {
    return `${where} es irregular (jagged): las filas tienen longitudes distintas`;
  }

  // Arrays demasiado cortos: distinguimos el array de matrices, el de filas y la fila.
  if (issue.code === "too_small") {
    if (where === "matrices") {
      return "'matrices' no puede estar vacio";
    }
    if (where.endsWith(".name")) {
      return `${where} debe ser una cadena no vacia`;
    }
    if (where.endsWith(".data")) {
      return `${where} debe ser un array no vacio`;
    }
    return `${where} debe ser un array no vacio`;
  }

  // Tipo inesperado: afinamos el mensaje según el campo afectado.
  if (issue.code === "invalid_type") {
    if (where === "matrices") {
      return "'matrices' debe ser un array";
    }
    if (where.endsWith(".name")) {
      return `${where} debe ser una cadena no vacia`;
    }
    if (where.endsWith(".data")) {
      return `${where} debe ser un array no vacio`;
    }
    // Un elemento numérico que no es número finito.
    return `${where} debe ser un numero finito`;
  }

  // Cualquier otro caso (p. ej. cuerpo que no es objeto JSON).
  if (where === "") {
    return "el cuerpo de la peticion debe ser un objeto JSON";
  }
  return `${where} no es valido`;
}

// Comprueba que el cuerpo de la petición tenga la forma esperada
// y, en caso contrario, lanza un HttpError(400)
export function validateMatrices(body: unknown): MatrixInput[] {
  const result = MatricesSchema.safeParse(body);
  if (!result.success) {
    throw new HttpError(400, describeIssue(result.error.issues[0]));
  }
  return result.data.matrices;
}

// computeMatrixStats devuelve max/min/average/sum sobre cada elemento de `data`
// más si la matriz es diagonal. Una matriz es diagonal cuando todo elemento
// fuera de la diagonal (i !== j) está dentro de EPSILON respecto a cero; esto
// también funciona para matrices rectangulares.
export function computeMatrixStats(data: number[][]): MatrixStats {
  let sum = 0;
  let count = 0;
  let max = -Infinity;
  let min = Infinity;
  let isDiagonal = true;

  data.forEach((row, i) => {
    row.forEach((value, j) => {
      sum += value;
      count += 1;
      if (value > max) max = value;
      if (value < min) min = value;
      if (i !== j && Math.abs(value) >= EPSILON) {
        isDiagonal = false;
      }
    });
  });

  return {
    max,
    min,
    average: sum / count,
    sum,
    isDiagonal,
  };
}

// computeStatistics calcula estadísticas por matriz, un agregado sobre la unión
// de todos los elementos, y si alguna matriz es diagonal.
export function computeStatistics(matrices: MatrixInput[]): Statistics {
  const perMatrix: Record<string, MatrixStats> = {};

  let sum = 0;
  let count = 0;
  let max = -Infinity;
  let min = Infinity;
  let anyDiagonal = false;

  matrices.forEach(({ name, data }) => {
    const stats = computeMatrixStats(data);
    perMatrix[name] = stats;

    if (stats.max > max) max = stats.max;
    if (stats.min < min) min = stats.min;
    anyDiagonal = anyDiagonal || stats.isDiagonal;

    data.forEach((row) => {
      row.forEach((value) => {
        sum += value;
        count += 1;
      });
    });
  });

  return {
    perMatrix,
    aggregate: {
      max,
      min,
      average: sum / count,
      sum,
    },
    anyDiagonal,
  };
}
