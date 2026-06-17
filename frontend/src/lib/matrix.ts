import { z } from "zod";

// MatrixSchema valida la matriz ya parseada: array no vacío de filas no vacías de
// números finitos, con todas las filas de la misma longitud. z.number() rechaza
// por sí solo NaN e Infinity, así que su mensaje cubre el caso "números finitos".
const MatrixSchema = z
  .array(
    z
      .array(
        z.number({
          error: "Todas las entradas de la matriz deben ser números finitos.",
        }),
      )
      .min(1, { error: "Cada fila debe ser un array de números no vacío." }),
  )
  .min(1, { error: "La matriz debe ser un array de filas no vacío." })
  .refine((matrix) => matrix.every((row) => row.length === matrix[0].length), {
    error: "Todas las filas deben tener el mismo número de columnas.",
  });

// parseMatrix valida que el contenido del textarea sea un array JSON de arrays de
// números finitos y que todas las filas tengan la misma longitud. Lanza un Error
// con un mensaje para el usuario ante cualquier problema.
export function parseMatrix(input: string): number[][] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(input);
  } catch {
    throw new Error("JSON inválido. Se espera algo como [[1,2],[3,4],[5,6]].");
  }

  const result = MatrixSchema.safeParse(parsed);
  if (!result.success) {
    // Mostramos el primer problema detectado con su mensaje en español.
    throw new Error(result.error.issues[0].message);
  }
  return result.data;
}

// formatNumber renderiza un float de forma compacta: los enteros siguen siendo
// enteros, y el resto de valores se muestran con hasta 4 decimales significativos
// (recortando los ceros finales).
export function formatNumber(value: number): string {
  if (Number.isInteger(value)) return String(value);
  return Number(value.toFixed(4)).toString();
}
