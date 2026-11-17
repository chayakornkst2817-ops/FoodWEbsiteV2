import { database, databaseFailure, localRequest } from "@/server/database";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  if (!localRequest(request)) return Response.json({ error: "Local only" }, { status: 403 });
  try {
    const result = await database().query("SELECT current_database() AS database, current_user AS role, now() AS time");
    return Response.json({ connected: true, ...result.rows[0] }, { headers: { "Cache-Control": "no-store" } });
  } catch { return databaseFailure(); }
}
