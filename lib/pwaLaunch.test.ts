import assert from "node:assert/strict";
import test from "node:test";
import { runInNewContext } from "node:vm";
import { PWA_LAUNCH_SCRIPT } from "./pwaLaunch";

function launch({ installed = true, ios = false, pathname = "/", search = "", hash = "", previous = null as string | null, blockedStorage = false } = {}) {
  const attributes = new Map<string, string>();
  let stored = previous;
  runInNewContext(PWA_LAUNCH_SCRIPT, {
    window: { matchMedia: () => ({ matches: installed }) },
    navigator: { standalone: ios },
    location: { pathname, search, hash },
    localStorage: {
      getItem: () => { if (blockedStorage) throw new Error("Storage blocked"); return stored; },
      setItem: (_key: string, value: string) => { stored = value; },
    },
    document: { documentElement: { setAttribute: (key: string, value: string) => attributes.set(key, value) } },
    Math: { random: () => 0, floor: Math.floor },
    Date,
  });
  return { attributes, stored };
}

test("regular browser visits do not show or rotate the installed-app welcome", () => {
  const result = launch({ installed: false, previous: "1" });
  assert.equal(result.attributes.size, 0);
  assert.equal(result.stored, "1");
});

test("all six locales support app entry routes, including iOS standalone", () => {
  for (const prefix of ["", "/es", "/ar", "/pt", "/de", "/ru"]) {
    for (const path of ["/", "/app", "/app/dreams"]) {
      assert.equal(launch({ pathname: prefix + path }).attributes.get("data-pwa-launch"), "0");
    }
  }
  assert.equal(launch({ installed: false, ios: true }).attributes.get("data-pwa-launch"), "0");
});

test("deep links, auth/payment returns and query/hash navigation stay unobstructed", () => {
  for (const pathname of ["/signin", "/ru/payment-success", "/app/profile", "/gallery", "/dreams/moon"]) {
    assert.equal(launch({ pathname }).attributes.size, 0);
  }
  assert.equal(launch({ search: "?code=return" }).attributes.size, 0);
  assert.equal(launch({ hash: "#dream" }).attributes.size, 0);
});

test("launch artwork cycles and survives disabled or corrupt storage", () => {
  assert.equal(launch({ previous: "0" }).stored, "1");
  assert.equal(launch({ previous: "1" }).stored, "2");
  assert.equal(launch({ previous: "2" }).stored, "0");
  assert.equal(launch({ previous: "broken" }).attributes.get("data-pwa-launch"), "0");
  assert.equal(launch({ blockedStorage: true }).attributes.get("data-pwa-launch"), "0");
});
