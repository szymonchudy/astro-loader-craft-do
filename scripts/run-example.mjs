import { spawn } from 'node:child_process';

const command = process.argv[2];
if (!['dev', 'build'].includes(command)) throw new Error('Expected dev or build.');
const child = spawn('pnpm', ['--dir', 'examples/basic', command], {
  stdio: 'inherit',
  env: { ...process.env, CRAFT_TEST_FIXTURE: '0' },
});
child.on('error', () => { console.error('Could not start the Astro example.'); process.exitCode = 1; });
child.on('exit', (code) => { process.exitCode = code ?? 1; });
