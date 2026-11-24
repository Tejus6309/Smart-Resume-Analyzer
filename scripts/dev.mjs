import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, readdirSync } from 'node:fs';
import { delimiter, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildReactRuntime, watchableApp } from './build.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const port = process.argv[2] ?? '8080';
const classpath = ['out', join('lib', '*')].join(delimiter);
const extension = process.platform === 'win32' ? '.exe' : '';
const jdkBin = process.env.JAVA_HOME ? resolve(process.env.JAVA_HOME, 'bin') : '';
const java = jdkBin ? join(jdkBin, `java${extension}`) : 'java';
const javac = jdkBin ? join(jdkBin, `javac${extension}`) : 'javac';

async function start() {
  if (!/^\d+$/.test(port) || Number(port) > 65535) {
    throw new Error('Choose a port from 0 to 65535.');
  }

  const src = join(root, 'src');
  const sources = readdirSync(src).filter(name => name.endsWith('.java'));
  mkdirSync(join(root, 'out'), { recursive: true });
  const compilation = spawnSync(javac, [
    '--release', '17', '-encoding', 'UTF-8', '-cp', join('lib', '*'),
    '-d', 'out', ...sources.map(name => join('src', name)),
  ], { cwd: root, stdio: 'inherit' });
  if (compilation.error?.code === 'ENOENT') {
    throw new Error('javac was not found. Install JDK 17 or newer and check JAVA_HOME or PATH.');
  }
  if (compilation.error) throw compilation.error;
  if (compilation.status !== 0) throw new Error('Java compilation failed.');

  await buildReactRuntime();
  const frontend = await watchableApp();

  try {
    await frontend.rebuild();
    await frontend.watch();
    const backend = spawn(java, [
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
