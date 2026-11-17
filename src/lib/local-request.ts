export function isLocalRequest(request: Request, enabled: boolean) {
  const url = new URL(request.url), origin = request.headers.get("origin");
  const loopback = (host: string) => ["localhost", "127.0.0.1", "[::1]"].includes(host);
  let sameLocalOrigin = !origin;
  if (origin) {
    try {
      const source = new URL(origin);
      sameLocalOrigin = ["http:", "https:"].includes(source.protocol) && loopback(source.hostname) && source.port === url.port;
    } catch { sameLocalOrigin = false; }
  }
  return enabled && loopback(url.hostname) && sameLocalOrigin && request.headers.get("sec-fetch-site") !== "cross-site";
}
