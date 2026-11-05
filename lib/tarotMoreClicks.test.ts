import assert from "node:assert/strict";
import test from "node:test";
import { createTarotMoreClickHandler } from "./tarotMoreClicks";
import type { MajorArcanaId } from "./tarot/deck";

function setup() {
  const clicks: MajorArcanaId[] = [];
  const handler = createTarotMoreClickHandler({
    verifyToken: async token => {
      if (token === "invalid") throw new Error("Expired token");
      return { uid: token };
    },
    isAdmin: uid => uid === "admin",
    validDraw: request => request.headers.get("x-valid-draw") === "1",
    increment: async cardId => { clicks.push(cardId); },
  });
  const click = (cardId: unknown, token?: string, validDraw = true) => handler(new Request("http://localhost/api/tarot/more-click", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(validDraw ? { "x-valid-draw": "1" } : {}) },
    body: JSON.stringify({ day: "2026-11-05", cardId }),
  }));
  return { clicks, click, handler };
}

test("counts guest and member taps on a revealed tarot card, including repeats", async () => {
  const { clicks, click } = setup();
  for (const token of [undefined, "visitor", "visitor"]) {
    const response = await click("priestess", token);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true, counted: true });
  }
  assert.deepEqual(clicks, ["priestess", "priestess", "priestess"]);
});

test("requires a valid revealed-card receipt and excludes signed-in admins", async () => {
  const { clicks, click, handler } = setup();
  assert.equal((await click("fool", undefined, false)).status, 403);
  assert.deepEqual(await (await click("fool", "admin")).json(), { ok: true, counted: false });
  assert.equal((await click("fool", "invalid")).status, 401);
  assert.equal((await handler(new Request("http://localhost/api/tarot/more-click", {
    method: "POST", headers: { "x-valid-draw": "1", Authorization: "Basic invalid" }, body: JSON.stringify({ day: "2026-11-05", cardId: "fool" }),
  }))).status, 401);
  assert.deepEqual(clicks, []);
});

test("rejects invalid cards and failed metric writes", async () => {
  const { clicks, click, handler } = setup();
  assert.equal((await click("unknown")).status, 400);
  assert.equal((await handler(new Request("http://localhost/api/tarot/more-click", { method: "POST", body: "{" }))).status, 400);
  assert.deepEqual(clicks, []);
  const failing = createTarotMoreClickHandler({
    verifyToken: async () => ({ uid: "visitor" }), isAdmin: () => false,
    validDraw: () => true, increment: async () => { throw new Error("Offline"); },
  });
  assert.equal((await failing(new Request("http://localhost/api/tarot/more-click", {
    method: "POST", body: JSON.stringify({ day: "2026-11-05", cardId: "fool" }),
  }))).status, 500);
});
