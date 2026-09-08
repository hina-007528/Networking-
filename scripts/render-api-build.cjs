/**
 * Render build helper. Avoids `npx --workspace`, which crashes npm with
 * "Cannot read properties of null (reading 'edgesOut')".
 */
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const api = path.join(root, 'apps', 'api');

function bin(name) {
  const unix = path.join(root, 'node_modules', '.bin', name);
  const nested = path.join(api, 'node_modules', '.bin', name);
  for (const candidate of [unix, `${unix}.cmd`, nested, `${nested}.cmd`]) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return name;
}

function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, stdio: 'inherit', shell: true, env: process.env });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

run(bin('prisma'), ['generate'], api);
run(bin('prisma'), ['migrate', 'deploy'], api);
run(bin('nest'), ['build'], api);
run(bin('tsc-alias'), ['-p', 'tsconfig.build.json'], api);
