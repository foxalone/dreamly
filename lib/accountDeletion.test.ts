import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";
import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth, type DecodedIdToken, type UserRecord } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { GET, POST } from "../app/api/account/delete/route";

const app = getApps().find(item => item.name === "project-server") ??
  initializeApp({ projectId: "dreamly-account-deletion-test" }, "project-server");
const auth = getAuth(app);
const db = getFirestore(app);
const url = "https://dreamly.test/api/account/delete";

function post(body: object, token?: string, path = url) {
  return new Request(path, {
    method: "POST",
    headers: token ? { authorization: "Bearer " + token } : undefined,
    body: JSON.stringify(body),
  });
}

test("signed-out deletion cannot reach Firebase", async t => {
  const verify = t.mock.method(auth, "verifyIdToken", async () => { throw new Error("Unexpected auth call"); });
  assert.equal((await GET(new Request(url))).status, 401);
  assert.equal((await POST(post({}))).status, 401);
  assert.equal(verify.mock.callCount(), 0);
});

test("the request body cannot specify another account", async t => {
  const verify = t.mock.method(auth, "verifyIdToken", async () => { throw new Error("Unexpected auth call"); });
  assert.equal((await POST(post({ uid: "other" }, "token"))).status, 400);
  assert.equal((await POST(post({}, "token", url + "?uid=other"))).status, 400);
  assert.equal(verify.mock.callCount(), 0);
});

function stubAccount(t: TestContext, provider: string) {
  const uid = "caller";
  const record: Record<string, unknown> = {};
  const job = { get: async () => ({ data: () => record }), set: async (data: object) => Object.assign(record, data) };
  const privateDoc = {
    path: "users/caller",
    collection: () => ({ get: async () => ({ docs: [] }) }),
  };
  const emptyPage = { get: async () => ({ empty: true }) };
  const verify = t.mock.method(auth, "verifyIdToken", async (token: string) => {
    assert.equal(token, "valid");
    return {
      uid, auth_time: Date.now() / 1000,
      firebase: { sign_in_provider: provider, identities: {} },
    } as DecodedIdToken;
  });
  t.mock.method(auth, "getUser", async (target: string) => {
    assert.equal(target, uid);
    return { providerData: [{ providerId: provider }] } as UserRecord;
  });
  t.mock.method(db, "collection", (name: string) => {
    if (name === "accountDeletions") {
      return { doc: (id: string) => {
        assert.match(id, /^[a-f0-9]{64}$/);
        return job;
      } };
    }
    if (name === "users") {
      return { doc: (id: string) => {
        assert.equal(id, uid);
        return privateDoc;
      } };
    }
    assert.equal(name, "shared_dreams");
    return { orderBy: () => ({ select: () => ({ limit: () => emptyPage }) }) };
  });
  t.mock.method(db, "runTransaction", async (operation: (tx: unknown) => Promise<unknown>) =>
    operation({
      get: (ref: typeof job) => ref.get(),
      set: (_ref: typeof job, data: object) => { Object.assign(record, data); },
    }));
  const purges: string[] = [];
  t.mock.method(db, "recursiveDelete", async (ref: { path: string }) => { purges.push(ref.path); });
  const deletes: string[] = [];
  t.mock.method(auth, "deleteUser", async (id: string) => { deletes.push(id); });
  return { deletes, purges, verify };
}

test("an authenticated request deletes only the token owner's private account", async t => {
  const fixture = stubAccount(t, "password");
  const response = await POST(post({}, "valid"));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { deleted: true });
  assert.deepEqual(fixture.purges, ["users/caller"]);
  assert.deepEqual(fixture.deletes, ["caller"]);
  assert.deepEqual(fixture.verify.mock.calls.map(call => call.arguments[1]), [undefined, true]);
});

test("an Apple-linked account cannot skip revocation", async t => {
  const fixture = stubAccount(t, "apple.com");
  const response = await POST(post({}, "valid"));
  assert.equal(response.status, 403);
  assert.deepEqual(await response.json(), { code: "APPLE_REAUTH_REQUIRED" });
  assert.deepEqual(fixture.purges, []);
  assert.deepEqual(fixture.deletes, []);
});

test("a failed Apple revocation cannot delete any data", async t => {
  const fixture = stubAccount(t, "apple.com");
  const previous = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY = "test-key";
  t.after(() => {
    if (previous === undefined) delete process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    else process.env.NEXT_PUBLIC_FIREBASE_API_KEY = previous;
  });
  t.mock.method(globalThis, "fetch", async (input: URL, options: RequestInit) => {
    assert.equal(input.hostname, "identitytoolkit.googleapis.com");
    assert.deepEqual(JSON.parse(String(options.body)), {
      providerId: "apple.com", tokenType: "3", token: "fake-code", idToken: "valid",
    });
    return new Response(null, { status: 400 });
  });
  assert.equal((await POST(post({ appleAuthorizationCode: "fake-code" }, "valid"))).status, 503);
  assert.deepEqual(fixture.purges, []);
  assert.deepEqual(fixture.deletes, []);
});

test("revoked Firebase sessions cannot delete an account", async t => {
  const verify = t.mock.method(auth, "verifyIdToken", async (_token: string, checkRevoked: boolean) => {
    if (checkRevoked) throw Object.assign(new Error("revoked"), { code: "auth/id-token-revoked" });
    return { uid: "caller" } as DecodedIdToken;
  });
  const deleteUser = t.mock.method(auth, "deleteUser", async () => {});
  assert.equal((await POST(post({}, "valid"))).status, 401);
  assert.equal(verify.mock.callCount(), 2);
  assert.equal(deleteUser.mock.callCount(), 0);
});

test("linked Apple accounts require a session authenticated with Apple", async t => {
  const fixture = stubAccount(t, "google.com");
  t.mock.method(auth, "getUser", async () => ({ providerData: [
    { providerId: "google.com" }, { providerId: "apple.com" },
  ] }) as UserRecord);
  assert.equal((await POST(post({ appleAuthorizationCode: "fake-code" }, "valid"))).status, 403);
  assert.deepEqual(fixture.purges, []);
  assert.deepEqual(fixture.deletes, []);
});
