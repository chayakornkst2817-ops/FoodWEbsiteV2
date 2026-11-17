import {databaseEnabled,uploadDatabaseFile} from "./database-client";
// Local prototype account hashing; production authentication is a separate step.
export type DemoAccount = {
  id: string;
  name: string;
  email: string;
  phone: string;
  salt: string;
  passwordHash: string;
};
export async function passwordHash(password: string, salt: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: new TextEncoder().encode(salt),
      iterations: 100000,
      hash: "SHA-256",
    },
    key,
    256,
  );
  return Array.from(new Uint8Array(bits), (n) =>
    n.toString(16).padStart(2, "0"),
  ).join("");
}
function openFiles(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("imjai-demo-files", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("slips");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(new Error("ไม่สามารถเปิดพื้นที่เก็บสลิปในเบราว์เซอร์"));
  });
}
export async function saveSlipFile(id: string, file: File) {
  if(databaseEnabled()){await uploadDatabaseFile(id,file,file.name);return;}
  const db = await openFiles();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("slips", "readwrite");
      tx.objectStore("slips").put(file, id);
      tx.oncomplete = () => resolve();
      tx.onerror = () =>
        reject(new Error("เก็บไฟล์สลิปไม่สำเร็จ กรุณาลองใหม่"));
      tx.onabort = () => reject(new Error("พื้นที่เก็บสลิปไม่เพียงพอ"));
    });
  } finally {
    db.close();
  }
}
export async function loadSlipFile(id: string): Promise<Blob | null> {
  if(databaseEnabled()){
    const response=await fetch(`/api/files/${encodeURIComponent(id)}/`,{cache:"no-store"});
    if(response.ok)return response.blob();
    if(response.status!==404)throw Error("โหลดรูปจากฐานข้อมูลไม่สำเร็จ");
  }
  const db = await openFiles();
  try {
    const blob = await new Promise<Blob | null>((resolve, reject) => {
      const request = db.transaction("slips").objectStore("slips").get(id);
      request.onsuccess = () =>
        resolve(request.result instanceof Blob ? request.result : null);
      request.onerror = () => reject(new Error("โหลดสลิปไม่สำเร็จ"));
    });
    if(blob && databaseEnabled()) await uploadDatabaseFile(id,blob,blob instanceof File ? blob.name : "legacy-image.jpg");
    return blob;
  } finally {
    db.close();
  }
}
