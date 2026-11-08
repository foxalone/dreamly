import assert from "node:assert/strict";
import test from "node:test";
import { createTranslationClickHandler, type TranslationClickSource } from "./translationClicks";

function setup() {
  const clicks: TranslationClickSource[] = [];
  const handler = createTranslationClickHandler({
    verifyToken: async token => {
      if (token === "invalid") throw new Error("Expired token");
      return { uid: token };
    },
    isAdmin: uid => uid === "admin",
    increment: async source => { clicks.push(source); },
  });
  const click = (source: unknown, token?: string) => handler(new Request("http://localhost/api/translation/click", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ source }),
  }));
  return { clicks, click, handler };
}

test("counts guest and signed-in feed icon clicks, including repeats", async () => {
  const { clicks, click } = setup();
  assert.deepEqual(await (await click("feed")).json(), { ok: true, counted: true });
  assert.deepEqual(await (await click("feed", "visitor")).json(), { ok: true, counted: true });
  assert.deepEqual(await (await click("feed", "visitor")).json(), { ok: true, counted: true });
  assert.deepEqual(await (await click("dream")).json(), { ok: true, counted: true });
  assert.deepEqual(clicks, ["feed", "feed", "feed", "dream"]);
});

test("excludes admin clicks and never treats invalid credentials as guests", async () => {
  const { clicks, click, handler } = setup();
  assert.deepEqual(await (await click("feed", "admin")).json(), { ok: true, counted: false });
  assert.equal((await click("feed", "invalid")).status, 401);
  assert.equal((await handler(new Request("http://localhost/api/translation/click", {
    method: "POST", headers: { Authorization: "Basic invalid" }, body: JSON.stringify({ source: "feed" }),
  }))).status, 401);
  assert.deepEqual(clicks, []);
});

test("rejects unknown sources and malformed JSON", async () => {
  const { clicks, click, handler } = setup();
  assert.equal((await click("other")).status, 400);
  assert.equal((await handler(new Request("http://localhost/api/translation/click", { method: "POST", body: "{" }))).status, 400);
  assert.deepEqual(clicks, []);
});
