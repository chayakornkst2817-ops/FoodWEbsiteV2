"use client";
import { documentKeys, validDocument, type DocumentKey } from "./persistence";

let enabled = false;
let queue = Promise.resolve();
let state = { pending: 0, error: "", conflict: false };
const listeners = new Set<(value: typeof state) => void>();
const failed = new Map<DocumentKey, unknown>();
const revisionKey = (key: string) => `${key}-database-revision`;
const notify = () => listeners.forEach(listener => listener({ ...state }));
export const databaseEnabled = () => enabled;
export const databaseStatus = () => ({ ...state });
export function subscribeDatabase(listener: (value: typeof state) => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
async function jsonResponse(response: Response) {
  const body = await response.json();
  if (!response.ok) throw Object.assign(new Error(body.error || "บันทึกฐานข้อมูลไม่สำเร็จ"), { conflict: response.status === 409 });
  return body;
}
async function persist(key: DocumentKey, payload: unknown) {
  const revision = Number(localStorage.getItem(revisionKey(key)) || 0);
  const result = await jsonResponse(await fetch("/api/persistence/", {
    method: "PUT", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key, revision, payload }),
  }));
  localStorage.setItem(revisionKey(key), String(result.revision));
}
export function clearIdentityCache() {
  for(const key of documentKeys){localStorage.removeItem(key);localStorage.removeItem(revisionKey(key));}
  sessionStorage.removeItem("imjai-demo-session");sessionStorage.removeItem("imjai-admin-session");
  localStorage.removeItem("imjai-server-identity");
  indexedDB.deleteDatabase("imjai-demo-files");
  localStorage.setItem("imjai-auth-change", crypto.randomUUID());
}
let bootstrap: Promise<void> | null = null;
export function bootstrapDatabase() {
  return bootstrap ??= bootstrapOnce().catch(error => { bootstrap = null; throw error; });
}
async function bootstrapOnce() {
  const result = await jsonResponse(await fetch("/api/persistence/", { cache: "no-store" }));
  localStorage.setItem("imjai-server-identity", JSON.stringify(result.identity ?? null));
  sessionStorage.removeItem("imjai-demo-session");sessionStorage.removeItem("imjai-admin-session");
  if(result.identity?.role === "customer")sessionStorage.setItem("imjai-demo-session", result.identity.id);
  if(result.identity?.role === "admin")sessionStorage.setItem("imjai-admin-session", result.identity.id);
  for (const key of documentKeys) {
    const record = result.documents.find((r: { key: string }) => r.key === key);
    localStorage.setItem(revisionKey(key), record?.revision ?? "0");
    if (record) {
      localStorage.setItem(key, JSON.stringify(record.payload));
    } else {
      localStorage.removeItem(key);
    }
  }
  enabled = true;
  const saved = JSON.parse(localStorage.getItem(documentKeys[0]) || "null");
  const ids = new Set<string>();
  for(const order of saved?.orders ?? []) {
    for(const slip of order.slips ?? []) if(slip.id && !slip.id.startsWith("demo-")) ids.add(slip.id);
    for(const message of order.messages ?? []) if(message.fileId) ids.add(message.fileId);
    for(const refund of order.refunds ?? []) if(refund.proofId) ids.add(refund.proofId);
  }
  if(ids.size) { const {loadSlipFile} = await import("./browser-storage"); for(const id of ids) await loadSlipFile(id); }
}
export function writeDocument(key: DocumentKey, payload: unknown) {
  const copy = JSON.parse(JSON.stringify(payload));
  localStorage.setItem(key, JSON.stringify(copy));
  if (!enabled) throw Error("ฐานข้อมูลยังไม่พร้อม");
  state = { ...state, pending: state.pending + 1 };
  notify();
  queue = queue.then(async () => {
    try {
      if (state.error) { failed.set(key, copy); return; }
      await persist(key, copy);
    } catch (error) {
      failed.set(key, copy);
      state = { ...state, error: (error as Error).message, conflict: !!(error as { conflict?: boolean }).conflict };
    } finally {
      state = { ...state, pending: state.pending - 1 };
      notify();
    }
  });
}
export async function retryDatabaseWrites() {
  if (state.conflict) return;
  await queue;
  const entries = [...failed.entries()];
  failed.clear();
  state = { pending: 0, error: "", conflict: false };
  entries.forEach(([key, payload]) => writeDocument(key, payload));
  notify();
}
export async function refreshDatabase() {
  if (state.pending || state.error) return;
  const result = await jsonResponse(await fetch("/api/persistence/", { cache: "no-store" }));
  if (state.pending || state.error) return;
  if(JSON.stringify(result.identity ?? null)!==localStorage.getItem("imjai-server-identity")){clearIdentityCache();window.location.reload();return;}
  for (const row of result.documents) {
    if (!documentKeys.includes(row.key) || Number(row.revision) <= Number(localStorage.getItem(revisionKey(row.key)) || 0)) continue;
    const value = JSON.stringify(row.payload);
    localStorage.setItem(row.key, value);
    localStorage.setItem(revisionKey(row.key), String(row.revision));
    window.dispatchEvent(new StorageEvent("storage", { key: row.key, newValue: value }));
  }
}
export async function uploadDatabaseFile(id: string, blob: Blob, name: string) {
  const form = new FormData();
  form.append("file", blob, name);
  await jsonResponse(await fetch(`/api/files/${encodeURIComponent(id)}/`, { method: "PUT", body: form }));
}

export function applyServerDocument(document:{key:DocumentKey;revision:string|number;payload:unknown}) {
  if(Number(document.revision)<Number(localStorage.getItem(revisionKey(document.key))||0))return;
  const value=JSON.stringify(document.payload);
  localStorage.setItem(document.key,value);localStorage.setItem(revisionKey(document.key),String(document.revision));
  window.dispatchEvent(new StorageEvent("storage",{key:document.key,newValue:value}));
}
// Serialize acknowledged mutations with existing snapshot writes, without treating a business rejection as a failed background save.
export function runDatabaseMutation<T>(task:()=>Promise<T>):Promise<T> {
  state={...state,pending:state.pending+1};notify();
  const result=queue.then(async()=>{if(state.error)throw Error(state.error);return task();});
  queue=result.then(()=>{},()=>{});
  return result.finally(()=>{state={...state,pending:state.pending-1};notify();});
}
