const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');

const repoRoot = path.resolve(__dirname, '../../..');
const ts = require('typescript');
const packageNames = ['types', 'validation', 'config'];

function remapWorkspaceRequest(request) {
  const normalised = request.replace(/\\/g, '/');

  for (const name of packageNames) {
    const marker = `packages/${name}/src/`;
    const index = normalised.indexOf(marker);
    if (index !== -1) {
      return path.join(repoRoot, 'packages', name, 'src', normalised.slice(index + marker.length));
    }

    const alias = `@stormfiber/${name}`;
    if (normalised === alias || normalised.startsWith(`${alias}/`)) {
      const rest = normalised.slice(alias.length).replace(/^\//, '');
      return path.join(repoRoot, 'packages', name, 'src', rest || 'index.ts');
    }
  }

  return null;
}

function resolveTsFile(candidate) {
  if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
    return candidate;
  }

  const withTs = candidate.endsWith('.ts') ? candidate : `${candidate}.ts`;
  if (fs.existsSync(withTs)) {
    return withTs;
  }

  const indexTs = path.join(candidate, 'index.ts');
  if (fs.existsSync(indexTs)) {
    return indexTs;
  }

  return null;
}

const originalResolve = Module._resolveFilename;
Module._resolveFilename = function resolveWorkspace(request, parent, isMain, options) {
  const remapped = typeof request === 'string' ? remapWorkspaceRequest(request) : null;
  if (remapped) {
    const resolved = resolveTsFile(remapped);
    if (resolved) {
      return resolved;
    }
  }

  if (
    typeof request === 'string' &&
    request.startsWith('.') &&
    parent?.filename &&
    parent.filename.replace(/\\/g, '/').includes('/packages/')
  ) {
    const resolved = resolveTsFile(path.resolve(path.dirname(parent.filename), request));
    if (resolved) {
      return resolved;
    }
  }

  try {
    return originalResolve.call(this, request, parent, isMain, options);
  } catch (error) {
    if (typeof request === 'string' && !request.startsWith('.') && !path.isAbsolute(request)) {
      return originalResolve.call(
        this,
        request,
        { id: 'workspace-root', filename: path.join(repoRoot, 'package.json'), paths: [] },
        isMain,
        options,
      );
    }
    throw error;
  }
};

Module._extensions['.ts'] = function compileTs(module, filename) {
  const source = fs.readFileSync(filename, 'utf8');
  const { outputText } = ts.transpileModule(source, {
    fileName: filename,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
      experimentalDecorators: true,
      emitDecoratorMetadata: true,
    },
  });
  module._compile(outputText, filename);
};
