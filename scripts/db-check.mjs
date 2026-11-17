import {readFile} from "node:fs/promises";
import nextEnv from "@next/env";
const {loadEnvConfig}=nextEnv;
import pg from "pg";
loadEnvConfig(process.cwd());
if(!process.env.DATABASE_URL && process.env.DATABASE_URL_FILE)process.env.DATABASE_URL=(await readFile(process.env.DATABASE_URL_FILE,"utf8")).trim();
const client = new pg.Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 5000 });
try {
  await client.connect();
  const result = await client.query(`SELECT current_database() AS database, current_user AS role,
    (SELECT count(*) FROM users)::int AS users, (SELECT count(*) FROM orders)::int AS orders,
    (SELECT count(*) FROM restaurants)::int AS restaurants, (SELECT count(*) FROM uploaded_files)::int AS files`);
  console.log(JSON.stringify({ connected: true, ...result.rows[0] }, null, 2));
} catch (error) { console.error("Database check failed:", error.code ?? error.message); process.exitCode = 1; }
finally { await client.end(); }

