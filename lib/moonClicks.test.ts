import assert from "node:assert/strict";
import test from "node:test";
import { createMoonClickHandler, type MoonClickSource } from "./moonClicks";

function setup() {
  const clicks: MoonClickSource[] = [];
  const handler = createMoonClickHandler({
    verifyToken: async token => {
      if (token === "invalid") throw new Error("Expired token");
      return { uid: token };
    },
    isAdmin: uid => uid === "admin",
    increment: async source => { clicks.push(source); },
  });
  const click = (source: unknown, token?: string) => handler(new Request("http://localhost/api/moon/click", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ source }),
  }));
  return { clicks, click, handler };
}

test("counts guest and signed-in visitor clicks from both entry points, including repeats", async () => {
  const { clicks, click } = setup();
  for (const source of ["home", "map", "map"]) {
    const response = await click(source, source === "map" ? "visitor" : undefined);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true, counted: true });
  }
  assert.deepEqual(clicks, ["home", "map", "map"]);
});

test("admin clicks never reach the counter from either entry point", async () => {
  const { clicks, click } = setup();
  for (const source of ["home", "map"]) {
    assert.deepEqual(await (await click(source, "admin")).json(), { ok: true, counted: false });
  }
  assert.deepEqual(clicks, []);
});

test("invalid credentials cannot fall back to anonymous counting", async () => {
  const { clicks, click, handler } = setup();
  assert.equal((await click("map", "invalid")).status, 401);
  assert.equal((await handler(new Request("http://localhost/api/moon/click", {
    method: "POST", headers: { Authorization: "Basic invalid" }, body: JSON.stringify({ source: "home" }),
  }))).status, 401);
  assert.deepEqual(clicks, []);
});

test("rejects unknown sources and malformed JSON without counting", async () => {
  const { clicks, click, handler } = setup();
  assert.equal((await click("other")).status, 400);
  assert.equal((await handler(new Request("http://localhost/api/moon/click", { method: "POST", body: "{" }))).status, 400);
  assert.deepEqual(clicks, []);
});

test("a failed write is not reported as counted", async () => {
  const handler = createMoonClickHandler({
    verifyToken: async () => ({ uid: "visitor" }), isAdmin: () => false,
    increment: async () => { throw new Error("Offline"); },
  });
  const response = await handler(new Request("http://localhost/api/moon/click", { method: "POST", body: JSON.stringify({ source: "home" }) }));
  assert.equal(response.status, 500);
});
