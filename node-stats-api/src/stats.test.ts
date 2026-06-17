import { test } from "node:test";
import assert from "node:assert/strict";

import {
  EPSILON,
  HttpError,
  validateMatrices,
  computeMatrixStats,
  computeStatistics,
} from "./stats.js";

test("computeMatrixStats: known square matrix", () => {
  const stats = computeMatrixStats([
    [1, 2],
    [3, 4],
  ]);
  assert.equal(stats.max, 4);
  assert.equal(stats.min, 1);
  assert.equal(stats.sum, 10);
  assert.equal(stats.average, 2.5);
  assert.equal(stats.isDiagonal, false);
});

test("computeMatrixStats: handles negatives", () => {
  const stats = computeMatrixStats([
    [-5, 0],
    [2, -1],
  ]);
  assert.equal(stats.max, 2);
  assert.equal(stats.min, -5);
  assert.equal(stats.sum, -4);
  assert.equal(stats.average, -1);
});

test("isDiagonal: true for a clean diagonal matrix", () => {
  const stats = computeMatrixStats([
    [5, 0],
    [0, 9],
  ]);
  assert.equal(stats.isDiagonal, true);
});

test("isDiagonal: tolerant of sub-epsilon off-diagonal noise", () => {
  const noise = EPSILON / 10;
  const stats = computeMatrixStats([
    [5, noise],
    [noise, 9],
  ]);
  assert.equal(stats.isDiagonal, true);
});

test("isDiagonal: false when off-diagonal noise exceeds epsilon", () => {
  const stats = computeMatrixStats([
    [5, 1e-3],
    [0, 9],
  ]);
  assert.equal(stats.isDiagonal, false);
});

test("isDiagonal: works on rectangular matrices", () => {
  // Las entradas fuera de la diagonal (i !== j) son todas cero, así que es
  // diagonal aunque no sea cuadrada.
  const diagonal = computeMatrixStats([
    [3, 0, 0],
    [0, 7, 0],
  ]);
  assert.equal(diagonal.isDiagonal, true);

  const notDiagonal = computeMatrixStats([
    [3, 0, 1],
    [0, 7, 0],
  ]);
  assert.equal(notDiagonal.isDiagonal, false);
});

test("computeStatistics: per-matrix, aggregate and anyDiagonal", () => {
  const result = computeStatistics([
    { name: "Q", data: [[1, 0], [0, 1]] },
    { name: "R", data: [[2, 3], [4, 5]] },
  ]);

  assert.deepEqual(Object.keys(result.perMatrix), ["Q", "R"]);
  assert.equal(result.perMatrix.Q.isDiagonal, true);
  assert.equal(result.perMatrix.R.isDiagonal, false);

  // Aggregate over the union: elements 1,0,0,1,2,3,4,5
  assert.equal(result.aggregate.max, 5);
  assert.equal(result.aggregate.min, 0);
  assert.equal(result.aggregate.sum, 16);
  assert.equal(result.aggregate.average, 2);

  assert.equal(result.anyDiagonal, true);
});

test("computeStatistics: anyDiagonal false when no matrix is diagonal", () => {
  const result = computeStatistics([
    { name: "A", data: [[1, 1], [1, 1]] },
    { name: "B", data: [[2, 2], [2, 2]] },
  ]);
  assert.equal(result.anyDiagonal, false);
});

test("validateMatrices: accepts a well-formed body", () => {
  const matrices = validateMatrices({
    matrices: [{ name: "Q", data: [[1, 2], [3, 4]] }],
  });
  assert.equal(matrices.length, 1);
});

test("validateMatrices: rejects missing matrices", () => {
  assert.throws(() => validateMatrices({}), (err) => {
    assert.ok(err instanceof HttpError);
    assert.equal(err.status, 400);
    return true;
  });
});

test("validateMatrices: rejects non-array matrices", () => {
  assert.throws(() => validateMatrices({ matrices: "nope" }), HttpError);
});

test("validateMatrices: rejects empty matrices", () => {
  assert.throws(() => validateMatrices({ matrices: [] }), HttpError);
});

test("validateMatrices: rejects jagged data", () => {
  assert.throws(
    () => validateMatrices({ matrices: [{ name: "Q", data: [[1, 2], [3]] }] }),
    (err) => {
      assert.ok(err instanceof HttpError);
      assert.equal(err.status, 400);
      assert.match(err.message, /jagged/);
      return true;
    },
  );
});

test("validateMatrices: rejects non-numeric data", () => {
  assert.throws(
    () => validateMatrices({ matrices: [{ name: "Q", data: [[1, "x"]] }] }),
    (err) => {
      assert.ok(err instanceof HttpError);
      assert.equal(err.status, 400);
      assert.match(err.message, /numero finito/);
      return true;
    },
  );
});

test("validateMatrices: rejects a matrix without a name", () => {
  assert.throws(
    () => validateMatrices({ matrices: [{ data: [[1, 2]] }] }),
    (err) => {
      assert.ok(err instanceof HttpError);
      assert.equal(err.status, 400);
      assert.match(err.message, /name/);
      return true;
    },
  );
});
