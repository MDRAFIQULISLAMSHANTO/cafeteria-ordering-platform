const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const { PGlite } = require('@electric-sql/pglite');
const { drizzle } = require('drizzle-orm/pglite');
const { pgTable, text } = require('drizzle-orm/pg-core');
const compiled = ts.transpileModule(fs.readFileSync('src/lib/optional-photo-table.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;
const helpers = { exports: {} };
new Function('exports', 'module', compiled)(helpers.exports, helpers);
const { readOptionalPhotos } = helpers.exports;

(async () => {
  const client = new PGlite();
  try {
    const db = drizzle(client);
    const photo = pgTable('product_photo', { id: text('product_id') });
    assert.deepEqual(await readOptionalPhotos(async () => db.select().from(photo)), []);
    await client.exec("CREATE TABLE product_photo (product_id text); INSERT INTO product_photo VALUES ('test-item')");
    assert.deepEqual(await readOptionalPhotos(async () => db.select().from(photo)), [{ id: 'test-item' }]);
    const other = pgTable('missing_orders', { id: text('id') });
    await assert.rejects(readOptionalPhotos(async () => db.select().from(other)));
    const denied = Object.assign(new Error('permission denied for table product_photo'), { code: '42501' });
    await assert.rejects(readOptionalPhotos(async () => { throw denied; }), e => e === denied);
    console.log('PASS: missing photo table fallback, migrated photo reads, unrelated errors preserved.');
  } finally {
    await client.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
