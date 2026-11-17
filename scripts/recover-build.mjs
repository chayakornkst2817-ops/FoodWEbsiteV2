// Run only after `npm run build` has compiled successfully and failed with
// EPERM while creating nested prerender directories on Windows.
import { mkdir, readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { restaurants } from '../src/lib/data.ts';

try {
  await readFile('.next/BUILD_ID', 'utf8');
} catch {
  console.error('Run npm run build first. Recovery requires the compiled build.');
  process.exit(1);
}
const routes = ['admin', 'merchant', 'checkout', 'orders', 'orders/detail', 'chat', 'payment', 'login', 'register', 'forgot-password', 'reset-password', 'profile',
  ...restaurants.map(r => `restaurants/${r.id}`)];
for (const route of routes) {
  await mkdir(path.join('.next/server/app', `${route}.segments`, route), { recursive: true });
}
const result = spawnSync(process.execPath, [
  'node_modules/next/dist/bin/next', 'build', '--webpack',
  '--experimental-build-mode', 'generate',
], { stdio: 'inherit', env: process.env });
process.exit(result.status ?? 1);

