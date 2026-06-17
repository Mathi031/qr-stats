import { test } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";

import { createApp } from "../app.js";

const KEY = "test-internal-key";
process.env.INTERNAL_API_KEY = KEY;

const app = createApp();
const validBody = { matrices: [{ name: "Q", data: [[1, 0], [0, 1]] }] };

test("statistics: 401 when X-Internal-Key is missing", async () => {
  const res = await request(app).post("/api/v1/statistics").send(validBody);
  assert.equal(res.status, 401);
  assert.match(res.body.error, /internal key/);
});

test("statistics: 401 when X-Internal-Key is wrong", async () => {
  const res = await request(app)
    .post("/api/v1/statistics")
    .set("X-Internal-Key", "nope")
    .send(validBody);
  assert.equal(res.status, 401);
});

test("statistics: 200 when X-Internal-Key matches", async () => {
  const res = await request(app)
    .post("/api/v1/statistics")
    .set("X-Internal-Key", KEY)
    .send(validBody);
  assert.equal(res.status, 200);
});

test("health stays open without an internal key", async () => {
  const res = await request(app).get("/health");
  assert.equal(res.status, 200);
});
