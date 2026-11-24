import { build, context } from 'esbuild';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const browserModule = { absWorkingDir: root, bundle: true, format: 'esm' };

export async function buildReactRuntime() {
  await build({
    ...browserModule,
    stdin: {
      contents: [
        "export { useEffect, useRef, useState } from 'react';",
        "export { createRoot } from 'react-dom/client';",
        "export { Fragment, jsx, jsxs } from 'react/jsx-runtime';",
      ].join('\n'),
      resolveDir: root,
    },
    outfile: 'web/react-runtime.js',
    minify: true,
  });
}

const app = {
  ...browserModule,
  entryPoints: ['web/src/main.jsx'],
  outfile: 'web/app.js',
  jsx: 'automatic',
  plugins: [{
    name: 'local-react-runtime',
    setup(builder) {
      builder.onResolve({ filter: /^(react|react-dom\/client|react\/jsx-runtime)$/ }, () => ({
        path: './react-runtime.js',
        external: true,
      }));
    },
  }],
};

export function watchableApp() {
  return context(app);
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  await buildReactRuntime();
  await build(app);
}
