import assert from "node:assert/strict";
import test from "node:test";
import { withBackend, backendContext, database } from "../app/_backend/runtime";
test("Worker context exists throughout request handling and isolates concurrent requests", async () => {
  await Promise.all(["one", "two"].map(async name => {
    const response = await withBackend(new Request(`https://${name}.test`), { SUPABASE_URL: name }, async () => {
      await Promise.resolve();
      assert.equal(backendContext().env.SUPABASE_URL, name);
      backendContext().cookies.push(`name=${name}; HttpOnly; Secure`);
      return new Response(name);
    });
    assert.equal(response.headers.get("set-cookie"), `name=${name}; HttpOnly; Secure`);
    assert.equal(await response.text(), name);
  }));
  assert.throws(() => backendContext());
});
test("missing database configuration fails closed in request context", async () => {
  await withBackend(new Request("https://test.invalid"), {}, async () => {
    assert.throws(() => database());
    return new Response(null);
  });
});

test("Hyperdrive binding takes precedence and runs parameterized queries in a transaction", async () => {
  await withBackend(new Request("https://shop.test/api/auth/google/callback"), {
    HYPERDRIVE: { connectionString: process.env.MEAWKETTING_TEST_DATABASE_URL! },
    DATABASE_URL: "postgres://unused:unused@unconfigured.invalid/postgres",
  }, async () => {
    const db = database();
    const results = await db.batch([
      db.prepare("SELECT ?::integer AS value").bind(42),
      db.prepare("SELECT ?::text AS value").bind("a 'quoted' value"),
    ]);
    assert.equal(results[0].results?.[0]?.value, 42);
    assert.equal(results[1].results?.[0]?.value, "a 'quoted' value");
    return new Response(null);
  });
});
