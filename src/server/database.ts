import "server-only";
import {isLocalRequest} from "@/lib/local-request";
import {readFileSync} from "node:fs";
import { Pool } from "pg";

const globalDatabase = globalThis as unknown as { imjaiPool?: Pool };
export function database() {
  const connection = process.env.DATABASE_URL || (process.env.DATABASE_URL_FILE ? readFileSync(process.env.DATABASE_URL_FILE,"utf8").trim() : "");
  if (!connection) throw new Error("DATABASE_NOT_CONFIGURED");
  return globalDatabase.imjaiPool ??= new Pool({
    connectionString: connection,
    max: 5,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
  });
}

// These prototype endpoints intentionally run only on the local development server.
// Database persistence does not turn the existing demo roles into production auth.
export const localRequest = (request: Request) => isLocalRequest(request, process.env.LOCAL_DATABASE_MODE === "true");
export const databaseFailure = () => Response.json(
  { error: "ติดต่อฐานข้อมูลไม่ได้ ตรวจ PostgreSQL และรัน npm run db:migrate" },
  { status: 503 },
);
