import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, readdirSync } from 'node:fs';
import { delimiter, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { context } from 'esbuild';

const root = fileURLToPath(new URL('../', import.meta.url));
const port = process.argv[2] ?? '8080';
const classpath = ['out', join('lib', '*')].join(delimiter);

async function start() {
  if (!/^\d+$/.test(port) || Number(port) > 65535) {
    throw new Error('Choose a port from 0 to 65535.');
  }

  const src = join(root, 'src');
  const sources = readdirSync(src).filter(name => name.endsWith('.java'));
  mkdirSync(join(root, 'out'), { recursive: true });
  const compilation = spawnSync('javac', [
    '--release', '17', '-encoding', 'UTF-8', '-cp', join('lib', '*'),
    '-d', 'out', ...sources.map(name => join('src', name)),
  ], { cwd: root, stdio: 'inherit' });
  if (compilation.error?.code === 'ENOENT') {
    throw new Error('javac was not found. Install JDK 17 or 21 and reopen your terminal.');
  }
  if (compilation.error) throw compilation.error;
  if (compilation.status !== 0) throw new Error('Java compilation failed.');

  const frontend = await context({
    absWorkingDir: root,
    entryPoints: ['web/src/main.jsx'],
    outfile: 'web/app.js',
    bundle: true,
    jsx: 'automatic',
    sourcemap: 'inline',
    logLevel: 'silent',
  });

  try {
    await frontend.rebuild();
    await frontend.watch();
    const backend = spawn('java', [
      '-cp', classpath, 'WebMain', port,
    ], { cwd: root, stdio: 'inherit' });
    const stop = () => { if (backend.exitCode === null && !backend.killed) backend.kill(); };
    process.once('SIGINT', stop);
    process.once('SIGTERM', stop);
    try {
      await new Promise((resolve, reject) => {
        backend.once('error', reject);
        backend.once('close', code => {
          process.exitCode = code ?? 0;
          resolve();
        });
      });
    } finally {
      process.removeListener('SIGINT', stop);
      process.removeListener('SIGTERM', stop);
    }
  } finally {
    await frontend.dispose();
  }
}

start().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
