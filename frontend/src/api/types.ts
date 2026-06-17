import { z } from "zod";

export const TokenResponseSchema = z.object({
  token: z.string(),
  expiresIn: z.number(),
});
export type TokenResponse = z.infer<typeof TokenResponseSchema>;

export const InputDimsSchema = z.object({
  rows: z.number(),
  cols: z.number(),
});
export type InputDims = z.infer<typeof InputDimsSchema>;

// Estadísticas por matriz calculadas por stats-api (con claves "Q" y "R").
export const MatrixStatsSchema = z.object({
  max: z.number(),
  min: z.number(),
  average: z.number(),
  sum: z.number(),
  isDiagonal: z.boolean(),
});
export type MatrixStats = z.infer<typeof MatrixStatsSchema>;

export const AggregateStatsSchema = z.object({
  max: z.number(),
  min: z.number(),
  average: z.number(),
  sum: z.number(),
});
export type AggregateStats = z.infer<typeof AggregateStatsSchema>;

export const StatisticsSchema = z.object({
  // Claves dinámicas ("Q", "R") asociadas a las estadísticas de cada matriz.
  perMatrix: z.record(z.string(), MatrixStatsSchema),
  aggregate: AggregateStatsSchema,
  anyDiagonal: z.boolean(),
});
export type Statistics = z.infer<typeof StatisticsSchema>;

export const QRResponseSchema = z.object({
  input: InputDimsSchema,
  q: z.array(z.array(z.number())),
  r: z.array(z.array(z.number())),
  statistics: StatisticsSchema,
});
export type QRResponse = z.infer<typeof QRResponseSchema>;
