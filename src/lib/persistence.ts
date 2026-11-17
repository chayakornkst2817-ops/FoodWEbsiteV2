export const documentKeys = ["imjai-demo-v2", "imjai-merchant-catalog", "imjai-governance-v5"] as const;
export type DocumentKey = typeof documentKeys[number];
export function validDocument(key: string, value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const v = value as Record<string, unknown>;
  if (key === documentKeys[0]) return Array.isArray(v.accounts) && Array.isArray(v.orders) &&
    Number.isInteger(v.timeoutMinutes) && Number(v.timeoutMinutes) >= 1 && Number(v.timeoutMinutes) <= 30;
  if (key === documentKeys[1]) return Object.values(v).every(c => c && typeof c === "object" &&
    Array.isArray((c as Record<string, unknown>).menus) && Array.isArray((c as Record<string, unknown>).slots));
  if (key === documentKeys[2]) return ["admins", "applications", "suspendedShops", "suspendedUsers", "audit"].every(k => Array.isArray(v[k]));
  return false;
}
