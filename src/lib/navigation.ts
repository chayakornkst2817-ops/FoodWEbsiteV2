// Keep post-login navigation within the prototype's customer and merchant flows.
export function returnPath(value: string | null, fallback = "/profile/") {
  if (!value || /[\\\u0000-\u001f]/.test(value)) return fallback;
  const path = value.split(/[?#]/)[0];
  return /^\/(?:checkout|orders(?:\/detail)?|profile|payment|chat|merchant(?:\/(?:register|pending))?)\/$/.test(path)
    ? value
    : fallback;
}
