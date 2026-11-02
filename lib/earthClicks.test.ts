import assert from "node:assert/strict";
import test from "node:test";
import { createEarthClickHandler, type EarthClickSource } from "./earthClicks";

function setup() {
  const clicks: EarthClickSource[] = [];
  const handler = createEarthClickHandler({
    verifyToken: async token => {
      if (token === "invalid") throw new Error("Expired token");
      return { uid: token };
    },
    isAdmin: uid => uid === "admin",
    increment: async source => { clicks.push(source); },
  });
  const click = (source: unknown, token?: string) => handler(new Request("http://localhost/api/earth/click", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ source }),
  }));
  return { clicks, click, handler };
}

test("counts guest and signed-in clicks on every Earth entry, including repeats", async () => {
  const { clicks, click } = setup();
  for (const source of ["globe", "home", "game", "globe"]) {
    const response = await click(source, source === "home" ? undefined : "visitor");
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true, counted: true });
  }
  assert.deepEqual(clicks, ["globe", "home", "game", "globe"]);
});

test("admin clicks never reach the Earth counter", async () => {
  const { clicks, click } = setup();
  for (const source of ["globe", "home", "game"]) {
    assert.deepEqual(await (await click(source, "admin")).json(), { ok: true, counted: false });
  }
  assert.deepEqual(clicks, []);
});

test("invalid credentials cannot fall back to anonymous Earth counting", async () => {
  const { clicks, click, handler } = setup();
  assert.equal((await click("globe", "invalid")).status, 401);
  assert.equal((await handler(new Request("http://localhost/api/earth/click", {
    method: "POST", headers: { Authorization: "Basic invalid" }, body: JSON.stringify({ source: "home" }),
  }))).status, 401);
  assert.deepEqual(clicks, []);
});

test("rejects unknown Earth sources and malformed JSON without counting", async () => {
  const { clicks, click, handler } = setup();
  assert.equal((await click("map")).status, 400);
  assert.equal((await handler(new Request("http://localhost/api/earth/click", { method: "POST", body: "{" }))).status, 400);
  assert.deepEqual(clicks, []);
});

test("a failed Earth write is not reported as counted", async () => {
  const handler = createEarthClickHandler({
    verifyToken: async () => ({ uid: "visitor" }), isAdmin: () => false,
    increment: async () => { throw new Error("Offline"); },
  });
  const response = await handler(new Request("http://localhost/api/earth/click", { method: "POST", body: JSON.stringify({ source: "globe" }) }));
  assert.equal(response.status, 500);
});
