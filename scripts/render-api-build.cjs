/**
 * Render build helper.
 *
 * Avoids `npx --workspace` (npm edgesOut crash) and PATH lookups for `prisma`
 * (missing when NODE_ENV=production omits the .bin shims).
 */
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const api = path.join(root, 'apps', 'api');

function cli(pkg, binKey) {
  let pkgJsonPath;
  try {
    pkgJsonPath = require.resolve(`${pkg}/package.json`, { paths: [api, root] });
  } catch {
    console.error(
      `Cannot find "${pkg}". In Render set Install Command to: npm install --include=dev`,
    );
    process.exit(1);
  }
  const manifest = require(pkgJsonPath);
  const binField = manifest.bin;
  const rel = typeof binField === 'string' ? binField : binField[binKey];
  if (!rel) {
    console.error(`Package "${pkg}" has no bin named "${binKey}"`);
    process.exit(1);
  }
  return path.join(path.dirname(pkgJsonPath), rel);
}

function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    stdio: 'inherit',
    env: process.env,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

run(process.execPath, [cli('prisma', 'prisma'), 'generate'], api);
run(process.execPath, [cli('prisma', 'prisma'), 'migrate', 'deploy'], api);
run(process.execPath, [cli('@nestjs/cli', 'nest'), 'build'], api);
run(process.execPath, [cli('tsc-alias', 'tsc-alias'), '-p', 'tsconfig.build.json'], api);
