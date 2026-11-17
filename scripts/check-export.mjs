import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

const root = path.resolve("out");
async function htmlFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(entries.map(entry => {
    const file = path.join(dir, entry.name);
    return entry.isDirectory() ? htmlFiles(file) : file.endsWith(".html") ? [file] : [];
  }));
  return nested.flat();
}
const files = await htmlFiles(root);
const failures = new Set();
let checked = 0;
for (const file of files) {
  const relative = path.relative(root, file).replaceAll(path.sep, "/");
  const base = new URL(relative, "https://qa.local/");
  const html = await readFile(file, "utf8");
  for (const match of html.matchAll(/\bhref="([^"<>]+)"/g)) {
    const url = new URL(match[1].replaceAll("&amp;", "&"), base);
    if (url.origin !== base.origin) continue;
    const target = path.resolve(root, "." + decodeURIComponent(url.pathname));
    if (target !== root && !target.startsWith(root + path.sep)) {
      failures.add(`${relative}: path outside export`);
      continue;
    }
    const candidates = [target, path.join(target, "index.html"), target + ".html"];
    let found = false;
    for (const candidate of candidates) {
      if (await stat(candidate).then(s => s.isFile()).catch(() => false)) { found = true; break; }
    }
    checked++;
    if (!found) failures.add(`${relative} → ${url.pathname}`);
  }
}
if (failures.size) {
  console.error([...failures].join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Export OK: ${files.length} HTML files, ${checked} internal links/assets checked.`);
}
