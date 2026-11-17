import { readFile } from "node:fs/promises";
import nextEnv from "@next/env";
const {loadEnvConfig}=nextEnv;
import pg from "pg";
loadEnvConfig(process.cwd());
if(!process.env.DATABASE_URL && process.env.DATABASE_URL_FILE)process.env.DATABASE_URL=(await readFile(process.env.DATABASE_URL_FILE,"utf8")).trim();
const admin = JSON.parse(await readFile(new URL("../.local/db-admin.json", import.meta.url), "utf8"));
const app = new URL(process.env.DATABASE_URL);
if (!["localhost", "127.0.0.1"].includes(app.hostname)) throw Error("Local setup only");
const client = new pg.Client({ host: app.hostname, port: Number(app.port), user: admin.user, password: admin.password, database: "postgres" });
try {
  await client.connect();
  const username = decodeURIComponent(app.username), password = decodeURIComponent(app.password), db = app.pathname.slice(1);
  if (!(await client.query("SELECT 1 FROM pg_roles WHERE rolname=$1", [username])).rowCount) {
    const result = await client.query("SELECT format('CREATE ROLE %I LOGIN PASSWORD %L', $1::text, $2::text) AS sql", [username, password]);
    await client.query(result.rows[0].sql);
  }
  if (!(await client.query("SELECT 1 FROM pg_database WHERE datname=$1", [db])).rowCount) {
    const result = await client.query("SELECT format('CREATE DATABASE %I OWNER %I', $1::text, $2::text) AS sql", [db, username]);
    await client.query(result.rows[0].sql);
  }
  console.log("Local application role and database are ready.");
} catch (error) { console.error("Database setup failed:", error.code ?? error.message); process.exitCode = 1; }
finally { await client.end(); }

