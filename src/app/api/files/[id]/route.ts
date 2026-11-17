import { identity } from "@/server/auth";
import { canReadFile } from "@/server/file-access";
import { createHash } from "node:crypto";
import { database, databaseFailure, localRequest } from "@/server/database";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };
const validId = (id: string) => /^[a-zA-Z0-9_-]{1,100}$/.test(id);
export async function GET(request: Request, context: Context) {
  if (!localRequest(request)) return new Response(null, { status: 403 });
  const { id } = await context.params;
  if (!validId(id)) return new Response(null, { status: 400 });
  try {
    const user=await identity(request);
    if(!await canReadFile(id,user))return new Response(null,{status:user?403:401});
    const result = await database().query("SELECT name, mime_type, content FROM uploaded_files WHERE id=$1", [id]);
    if (!result.rowCount) return new Response(null, { status: 404 });
    const row = result.rows[0];
    return new Response(new Uint8Array(row.content), { headers: {
      "Content-Type": row.mime_type, "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(row.name)}`,
    } });
  } catch { return databaseFailure(); }
}
export async function PUT(request: Request, context: Context) {
  if (!localRequest(request)) return new Response(null, { status: 403 });
  const { id } = await context.params;
  if (!validId(id)) return new Response(null, { status: 400 });
  if (Number(request.headers.get("content-length") || 0) > 5 * 1024 * 1024 + 16384)
    return Response.json({ error: "รูปต้องไม่เกิน 5 MB" }, { status: 413 });
  try {
    const user=await identity(request);if(!user)return new Response(null,{status:401});
    const form = await request.formData(), file = form.get("file");
    if (!(file instanceof File) || !["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024)
      return Response.json({ error: "ใช้รูป JPG/PNG/WebP ไม่เกิน 5 MB" }, { status: 400 });
    const bytes = Buffer.from(await file.arrayBuffer());
    const image = file.type === "image/jpeg" ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
      : file.type === "image/png" ? bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))
      : bytes.toString("ascii",0,4) === "RIFF" && bytes.toString("ascii",8,12) === "WEBP";
    if (!image) return Response.json({ error: "เนื้อหาไฟล์ไม่ตรงกับชนิดรูป" }, { status: 400 });
    const hash = createHash("sha256").update(bytes).digest("hex");
    const result = await database().query(
      "INSERT INTO uploaded_files(id,name,mime_type,content,sha256,owner_id,restaurant_id) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(id) DO NOTHING RETURNING id",
      [id, file.name.slice(0, 250), file.type, bytes, hash,user.id,user.restaurantId??null],
    );
    if (!result.rowCount) {
      if(!await canReadFile(id,user))return new Response(null,{status:403});
      const existing = await database().query("SELECT sha256 FROM uploaded_files WHERE id=$1", [id]);
      if (existing.rows[0]?.sha256 !== hash) return Response.json({ error: "ไฟล์เดิมเปลี่ยนทับไม่ได้" }, { status: 409 });
    }
    return Response.json({ id });
  } catch { return databaseFailure(); }
}
