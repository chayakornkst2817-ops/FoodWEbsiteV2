import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
const action = process.argv[2] ?? "status";
if (!["start", "stop", "status"].includes(action)) throw Error("Unknown database action");
const config = JSON.parse(await readFile(new URL("../.local/db-runtime.json", import.meta.url), "utf8"));
const executable = path.join(config.bin, process.platform === "win32" ? "pg_ctl.exe" : "pg_ctl");
const run = args => spawnSync(executable, ["-D", config.data, ...args], { stdio: "inherit", windowsHide: true });
let result;
if (action === "start") {
  if (run(["status"]).status === 0) process.exit(0);
  result = run(["-l", path.join(config.data, "server.log"), "-o", `-h 127.0.0.1 -p ${config.port}`, "start"]);
} else result = run(action === "stop" ? ["-m", "fast", "stop"] : ["status"]);
process.exitCode = result.status ?? 1;
