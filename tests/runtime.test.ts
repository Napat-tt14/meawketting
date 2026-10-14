import assert from "node:assert/strict";
import test from "node:test";
import { withBackend, backendContext, database } from "../app/_backend/runtime";
import { TestSql, localBinding } from "./d1TestKit";
import { chunkIds } from "../app/_backend/d1";

test("Worker context isolates concurrent requests and scoped cookies", async () => {
  await Promise.all(["one", "two"].map(async name => {
    const response = await withBackend(new Request(`https://${name}.test/api/be1`), { MEAWKETTING_PUBLIC_ORIGIN: name }, async () => {
      await Promise.resolve();
      assert.equal(backendContext().env.MEAWKETTING_PUBLIC_ORIGIN, name);
      backendContext().cookies.push(`name=${name}; HttpOnly; Secure`);
      return new Response(name);
    });
    assert.equal(response.headers.get("set-cookie"), `name=${name}; HttpOnly; Secure`);
    assert.equal(response.headers.get("cache-control"), "private, no-store");
    assert.match(response.headers.get("server-timing")!, /app;dur=/);
    assert.equal(await response.text(), name);
  }));
  assert.throws(() => backendContext());
});
test("missing D1 binding fails closed", async () => {
  await withBackend(new Request("https://test.invalid"), {}, async () => { assert.throws(() => database()); return new Response(null); });
});
test("runtime uses DB binding, parameterized SQLite and atomic batch rollback", async t => {
  const inspect = new TestSql(); t.after(() => inspect.close());
  inspect.exec("CREATE TABLE sample(id INTEGER PRIMARY KEY,value TEXT NOT NULL)");
  const response = await withBackend(new Request("https://shop.test/api/test"), { DB: localBinding(inspect) }, async () => {
    const db = database();
    const results = await db.batch([db.prepare("SELECT ? AS value").bind(42), db.prepare("SELECT ? AS value").bind("a 'quoted' value")]);
    assert.equal(results[0].results?.[0]?.value, 42);
    assert.equal(results[1].results?.[0]?.value, "a 'quoted' value");
    await assert.rejects(db.batch([db.prepare("INSERT INTO sample VALUES(1,'one')"), db.prepare("INSERT INTO sample VALUES(1,'duplicate')")]));
    assert.equal(await db.prepare("SELECT count(*) FROM sample").first("count(*)"), 0);
    assert.throws(() => db.prepare("SELECT ?").bind(undefined), /Invalid D1/);
    assert.throws(() => db.prepare("SELECT ?").bind(...Array(101).fill(1)), /parameter limit/);
    return new Response(null);
  });
  assert.match(response.headers.get("server-timing")!, /d1-statements;desc="5"/);
  assert.match(response.headers.get("server-timing")!, /d1-meta-statements;desc="2"/);
  assert.match(response.headers.get("server-timing")!, /d1-rows-read;desc="2"/);
  assert.doesNotMatch(response.headers.get("server-timing")!, /quoted|duplicate/);
});
test("ID chunks remain below D1 limits and preserve all IDs", () => {
  const ids = Array.from({ length: 251 }, (_, i) => i), chunks = chunkIds(ids);
  assert.deepEqual(chunks.map(chunk => chunk.length), [80,80,80,11]);
  assert.deepEqual(chunks.flat(), ids); assert.deepEqual(chunkIds([]), []);
  assert.throws(() => chunkIds(ids, 101));
});
