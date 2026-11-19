// Optional automated checks using only Node's built-in modules and the project's JDK.
import { spawn, spawnSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, delimiter } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { once } from 'node:events';

const root = fileURLToPath(new URL('../', import.meta.url));
const java = process.env.JAVA_HOME ? join(process.env.JAVA_HOME, 'bin', 'java.exe') : 'java';
const javac = process.env.JAVA_HOME ? join(process.env.JAVA_HOME, 'bin', 'javac.exe') : 'javac';
const temp = mkdtempSync(join(tmpdir(), 'resume-memory-test-'));
const classes = join(temp, 'out');
const cp = [classes, join(root, 'lib', '*')].join(delimiter);
let server;
let checks = 0;
function check(name, condition) {
  assert.ok(condition, name);
  console.log('PASS ' + (++checks) + ' ' + name);
}
async function start() {
  server = spawn(java, ['-cp', cp, 'WebMain', '0', join(root, 'web')], { cwd: temp });
  let output = '';
  return await new Promise((resolve, reject) => {
    const timer = setTimeout(() => { server.kill(); reject(new Error('Server startup timed out')); }, 15000);
    server.stdout.on('data', bytes => {
      output += bytes;
      const address = output.match(/Open (http:\/\/127\.0\.0\.1:\d+)/);
      if (address) { clearTimeout(timer); resolve(address[1]); }
    });
    server.stderr.on('data', bytes => process.stderr.write(bytes));
    server.once('error', error => { clearTimeout(timer); reject(error); });
    server.once('exit', code => { clearTimeout(timer); reject(new Error('Server exited: ' + code)); });
  });
}
async function stop() {
  if (server && server.exitCode === null) {
    const done = once(server, 'exit');
    server.kill();
    await done;
  }
}
try {
  const compilation = spawnSync(javac, ['--release', '17', '-encoding', 'UTF-8',
    '-cp', join(root, 'lib', '*'), '-d', classes,
    ...readdirSync(join(root, 'src')).filter(n => n.endsWith('.java')).map(n => join(root, 'src', n))],
    { encoding: 'utf8', timeout: 30000 });
  assert.equal(compilation.status, 0, compilation.stderr || String(compilation.error));
  check('Java compilation', true);
  let base = await start();
  let cookie = '';
  async function api(path, form, raw) {
    const headers = { Cookie: cookie, 'X-Resume-Matcher': '1' };
    const response = await fetch(base + path, form === undefined ? { headers }
      : { method: 'POST', headers, body: raw ? form : new URLSearchParams(form) });
    const newCookie = response.headers.get('set-cookie');
    if (newCookie) cookie = newCookie.split(';')[0];
    const text = await response.text();
    return { status: response.status, text, data: response.headers.get('content-type')?.startsWith('application/json') ? JSON.parse(text) : null };
  }
  check('React bundle served', (await api('/app.js')).status === 200);
  check('Anonymous workspace rejected', (await api('/workspace')).status === 401);
  check('Short password rejected', (await api('/register', { username: 'tester', password: 'short' })).status === 400);
  const credentials = { username: 'tester', password: 'LocalTest123!' };
  check('Registration works', (await api('/register', credentials)).data.username === 'tester');
  check('Duplicate registration rejected', (await api('/register', credentials)).status === 400);
  check('Empty workspace', (await api('/workspace')).data.jobs.length === 0);
  check('Empty job rejected', (await api('/jobs', { title: '', company: 'Demo', description: 'Java' })).status === 400);
  for (const [title, description] of [['Java Developer', 'Java SQL Git'], ['Web Developer', 'React JavaScript'], ['Unlisted skills', 'astronomy']]) {
    assert.equal((await api('/jobs', { title, company: 'Demo Company', description })).status, 200);
  }
  check('Jobs returned from backend', (await api('/workspace')).data.jobs.length === 3);
  check('Missing resume rejected', (await api('/match', { name: 'Test', resume: '' })).status === 400);
  const result = (await api('/match', { name: 'Sample Candidate', resume: 'Java Git', save: 'yes' })).data;
  check('Score calculation', result.matches[0].score === '66.67%');
  check('Missing skills', result.matches[0].missing.join(',') === 'SQL');
  check('Rank and Java word boundaries', result.matches[1].score === '0.00%');
  check('No recognized skills gives N/A last', result.matches[2].score === 'N/A');
  check('Resume available for reuse', (await api('/workspace')).data.resumes.length === 1);
  const reused = (await api('/match', { saved: String(result.resumeId), job: '1' })).data;
  check('Saved resume comparison', reused.matches[0].score === '66.67%');
  const history = (await api('/history')).data;
  check('Every comparison adds history', history.length === 4);
  check('History newest first and Indian time', history[0].startsWith('#4 | ') && history[0].includes(' IST |'));
  check('Invalid job rejected', (await api('/match', { saved: '1', job: '999' })).status === 400);
  check('Invalid saved resume rejected', (await api('/match', { saved: '999' })).status === 400);
  for (let i = 0; i < 2; i++) assert.equal((await api('/report', { saved: '1', job: '1' })).status, 200);
  const reportFiles = readdirSync(join(temp, 'reports'));
  check('Reports append to same resume file', reportFiles.length === 1 && readFileSync(join(temp, 'reports', reportFiles[0]), 'utf8').split('Candidate Name:').length === 3);
  check('Unsaved resume report', (await api('/report', { saved: '0', report: result.matches[0].report })).status === 200);
  for (const format of ['pdf', 'docx']) {
    const response = await api('/extract?' + format, readFileSync(join(root, 'tests', 'fixtures', 'sample.' + format)), true);
    check(format.toUpperCase() + ' text extraction', response.status === 200 && response.text.trim().length > 0);
  }
  check('Invalid upload rejected', (await api('/extract?pdf', Buffer.from('not a pdf'), true)).status === 422);
  await api('/logout', {});
  check('Logout protects history', (await api('/history')).status === 401);
  check('Wrong password rejected', (await api('/login', { ...credentials, password: 'WrongPass123' })).status === 401);
  check('Login works during same backend run', (await api('/login', credentials)).status === 200);
  await stop();
  base = await start();
  check('Old session rejected after restart', (await api('/workspace')).status === 401);
  check('Accounts clear after restart', (await api('/login', credentials)).status === 401);
  await api('/register', credentials);
  const empty = (await api('/workspace')).data;
  check('Jobs resumes and history clear after restart', empty.jobs.length === 0 && empty.resumes.length === 0 && (await api('/history')).data.length === 0);
  await api('/jobs', { title: 'New Job', company: 'New Company', description: 'Python' });
  await api('/match', { name: 'Another Candidate', resume: 'Python', save: 'yes', job: '1' });
  await api('/report', { saved: '1', job: '1' });
  check('Restart cannot mix reports for reused resume IDs', readdirSync(join(temp, 'reports')).length === 3);
  check('No database or data folder created', !existsSync(join(temp, 'data')));
  const consoleRun = spawnSync(java, ['-cp', cp, 'Main'], { cwd: temp, encoding: 'utf8', timeout: 15000,
    input: '3\nConsole Job\nDemo\nJava SQL\nEND\n1\nConsole Candidate\nJava\nEND\n5\n1\n7\n8\n10\n1\n9\n' });
  check('Console add resume job match history report and reuse', consoleRun.status === 0 && consoleRun.stdout.includes('50.00%') && consoleRun.stdout.includes(' IST |') && consoleRun.stdout.includes('Loaded resume #1'));
  console.log('All ' + checks + ' checks passed. Test data used an isolated temporary folder.');
} finally {
  await stop();
  rmSync(temp, { recursive: true, force: true });
}
