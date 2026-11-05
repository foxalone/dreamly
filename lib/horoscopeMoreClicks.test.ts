import assert from "node:assert/strict";
import test from "node:test";
import { createHoroscopeMoreClickHandler } from "./horoscopeMoreClicks";
import type { Sign } from "./horoscope/model";

function setup() {
  const clicks: Sign[] = [];
  const handler = createHoroscopeMoreClickHandler({
    verifyToken: async token => {
      if (token === "invalid") throw new Error("Expired token");
      return { uid: token };
    },
    isAdmin: uid => uid === "admin",
    increment: async sign => { clicks.push(sign); },
  });
  const click = (sign: unknown, token?: string) => handler(new Request("http://localhost/api/horoscope/more-click", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ sign }),
  }));
  return { clicks, click, handler };
}

test("counts guest and signed-in forecast more clicks, including repeats", async () => {
  const { clicks, click } = setup();
  for (const [sign, token] of [["aries", undefined], ["sagittarius", "visitor"], ["sagittarius", "visitor"]] as const) {
    const response = await click(sign, token);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true, counted: true });
  }
  assert.deepEqual(clicks, ["aries", "sagittarius", "sagittarius"]);
});

test("excludes signed-in admin clicks and does not count invalid credentials as guests", async () => {
  const { clicks, click, handler } = setup();
  assert.deepEqual(await (await click("aries", "admin")).json(), { ok: true, counted: false });
  assert.equal((await click("aries", "invalid")).status, 401);
  assert.equal((await handler(new Request("http://localhost/api/horoscope/more-click", {
    method: "POST", headers: { Authorization: "Basic invalid" }, body: JSON.stringify({ sign: "aries" }),
  }))).status, 401);
  assert.deepEqual(clicks, []);
});

test("rejects invalid signs and failed writes", async () => {
  const { clicks, click, handler } = setup();
  assert.equal((await click("other")).status, 400);
  assert.equal((await handler(new Request("http://localhost/api/horoscope/more-click", { method: "POST", body: "{" }))).status, 400);
  assert.deepEqual(clicks, []);
  const failing = createHoroscopeMoreClickHandler({
    verifyToken: async () => ({ uid: "visitor" }),
    isAdmin: () => false,
    increment: async () => { throw new Error("Offline"); },
  });
  assert.equal((await failing(new Request("http://localhost/api/horoscope/more-click", {
    method: "POST", body: JSON.stringify({ sign: "aries" }),
  }))).status, 500);
});
