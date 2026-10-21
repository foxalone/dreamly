import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { loadServiceAccount } from "./firebaseServiceAccount";

const account = {
  project_id: "test-project",
  client_email: "test@example.invalid",
  private_key: 'synthetic key with {braces}, "quotes", a backslash \\ and\nnewlines',
};

function fixture(run: (cwd: string) => void) {
  const cwd = mkdtempSync(path.join(os.tmpdir(), "dreamly-firebase-test-"));
  try { run(cwd); } finally { rmSync(cwd, { recursive: true, force: true }); }
}

test("complete environment JSON takes precedence over local configuration", () => {
  fixture((cwd) => {
    writeFileSync(path.join(cwd, ".env.local"), 'FIREBASE_SERVICE_ACCOUNT_JSON={"project_id":"other-project"}');
    assert.deepEqual(loadServiceAccount({ FIREBASE_SERVICE_ACCOUNT_JSON: JSON.stringify(account) }, cwd), account);
  });
});

test("recovers Next.js-truncated multiline JSON without consuming following variables", () => {
  fixture((cwd) => {
    writeFileSync(path.join(cwd, ".env.local"), `OTHER=value\nFIREBASE_SERVICE_ACCOUNT_JSON=${JSON.stringify(account, null, 2)}\nAFTER=value\n`);
    assert.deepEqual(loadServiceAccount({ FIREBASE_SERVICE_ACCOUNT_JSON: "{" }, cwd), account);
  });
});

test("supports relative and absolute service account files", () => {
  fixture((cwd) => {
    const file = path.join(cwd, "account.json");
    writeFileSync(file, JSON.stringify(account));
    for (const filePath of ["account.json", file]) {
      assert.deepEqual(loadServiceAccount({ FIREBASE_SERVICE_ACCOUNT_PATH: filePath }, cwd), account);
    }
  });
});

test("invalid or incomplete configuration fails without leaking credential content", () => {
  fixture((cwd) => {
    for (const json of ["{synthetic-secret", "null", "[]", '"synthetic-secret"']) {
      assert.throws(() => loadServiceAccount({ FIREBASE_SERVICE_ACCOUNT_JSON: json }, cwd), {
        message: "Firebase service account must be a valid JSON object",
      });
    }
    writeFileSync(path.join(cwd, ".env.local"), 'FIREBASE_SERVICE_ACCOUNT_JSON={\n"private_key":"synthetic-secret"\n');
    assert.throws(() => loadServiceAccount({ FIREBASE_SERVICE_ACCOUNT_JSON: "{" }, cwd), {
      message: "Firebase service account must be a valid JSON object",
    });
    assert.throws(() => loadServiceAccount({}, cwd), /Missing FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT_PATH/);
  });
});
