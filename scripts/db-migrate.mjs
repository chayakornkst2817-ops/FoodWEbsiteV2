import { readFile } from "node:fs/promises";
import nextEnv from "@next/env";
const {loadEnvConfig}=nextEnv;
import pg from "pg";
import { upgradePaNoiMenus } from "../src/lib/menu-options.ts";
import { restaurants } from "../src/lib/data.ts";
loadEnvConfig(process.cwd());
if(!process.env.DATABASE_URL && process.env.DATABASE_URL_FILE)process.env.DATABASE_URL=(await readFile(process.env.DATABASE_URL_FILE,"utf8")).trim();
if (!process.env.DATABASE_URL) throw Error("Set DATABASE_URL in .env.local first");
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
try {
  await client.connect();
  await client.query("BEGIN");
  await client.query(await readFile(new URL("../database/migrations/001_local_persistence.sql", import.meta.url), "utf8"));
  await client.query(await readFile(new URL("../database/migrations/002_single_restaurant.sql", import.meta.url), "utf8"));
  for (const restaurant of restaurants) await client.query(
    "INSERT INTO restaurant_defaults(id,payload) VALUES($1,$2::jsonb) ON CONFLICT(id) DO NOTHING", [restaurant.id, JSON.stringify(restaurant)],
  );
  const defaults = await client.query("SELECT payload FROM restaurant_defaults WHERE id='pa-noi' FOR UPDATE");
  if (defaults.rows[0]) {
    const payload = defaults.rows[0].payload;
    const next = {...payload, menus: upgradePaNoiMenus(payload.menus)};
    if (JSON.stringify(next) !== JSON.stringify(payload)) await client.query("UPDATE restaurant_defaults SET payload=$1::jsonb WHERE id='pa-noi'", [JSON.stringify(next)]);
  }
  const catalog = await client.query("SELECT payload FROM app_state WHERE key='imjai-merchant-catalog' FOR UPDATE");
  if (catalog.rows[0]?.payload['pa-noi']) {
    const payload = catalog.rows[0].payload;
    const next = {...payload, 'pa-noi': {...payload['pa-noi'], menus: upgradePaNoiMenus(payload['pa-noi'].menus)}};
    if (JSON.stringify(next) !== JSON.stringify(payload)) await client.query("UPDATE app_state SET payload=$1::jsonb,revision=revision+1,updated_at=now() WHERE key='imjai-merchant-catalog'", [JSON.stringify(next)]);
  }
  await client.query(await readFile(new URL("../database/migrations/003_accounts.sql", import.meta.url), "utf8"));
  await client.query(await readFile(new URL("../database/migrations/004_order_submissions.sql", import.meta.url), "utf8"));
  await client.query("COMMIT");
  console.log("Database schema and pgAdmin views are ready.");
} catch (error) {
  await client.query("ROLLBACK").catch(() => {});
  console.error("Migration failed:", error.code ?? error.message);
  process.exitCode = 1;
} finally { await client.end(); }

