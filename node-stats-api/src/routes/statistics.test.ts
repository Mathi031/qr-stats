import { test } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";

import { createApp } from "../app.js";

// Todas las peticiones de estadísticas se autentican ahora con la clave interna.
const KEY = "test-internal-key";
process.env.INTERNAL_API_KEY = KEY;

const app = createApp();

test("POST /api/v1/statistics: returns stats for valid matrices", async () => {
  const res = await request(app)
    .post("/api/v1/statistics")
    .set("X-Internal-Key", KEY)
    .send({
      matrices: [
        { name: "Q", data: [[1, 0], [0, 1]] },
        { name: "R", data: [[2, 3], [4, 5]] },
      ],
    });

  assert.equal(res.status, 200);
  assert.equal(res.body.perMatrix.Q.isDiagonal, true);
  assert.equal(res.body.perMatrix.R.isDiagonal, false);
  assert.equal(res.body.aggregate.sum, 16);
  assert.equal(res.body.aggregate.max, 5);
  assert.equal(res.body.aggregate.min, 0);
  assert.equal(res.body.anyDiagonal, true);
});

test("POST /api/v1/statistics: 400 when matrices is missing", async () => {
  const res = await request(app)
    .post("/api/v1/statistics")
    .set("X-Internal-Key", KEY)
    .send({});
  assert.equal(res.status, 400);
  assert.match(res.body.error, /matrices/);
});

test("POST /api/v1/statistics: 400 when matrices is not an array", async () => {
  const res = await request(app)
    .post("/api/v1/statistics")
    .set("X-Internal-Key", KEY)
    .send({ matrices: "nope" });
  assert.equal(res.status, 400);
});

test("POST /api/v1/statistics: 400 when data is jagged", async () => {
  const res = await request(app)
    .post("/api/v1/statistics")
    .set("X-Internal-Key", KEY)
    .send({ matrices: [{ name: "Q", data: [[1, 2], [3]] }] });
  assert.equal(res.status, 400);
  assert.match(res.body.error, /jagged/);
});

test("POST /api/v1/statistics: 400 when data is non-numeric", async () => {
  const res = await request(app)
    .post("/api/v1/statistics")
    .set("X-Internal-Key", KEY)
    .send({ matrices: [{ name: "Q", data: [[1, "x"]] }] });
  assert.equal(res.status, 400);
});
