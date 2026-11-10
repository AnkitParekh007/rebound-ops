import { existsSync, realpathSync } from 'node:fs';
import { dirname, join, win32 } from 'node:path';

/** Resolve npm's JavaScript entry point so Windows never needs cmd /c.
 * Forked launchers do not necessarily inherit npm_execpath. Propagate a
 * discovered CLI to runtime preparation as well as the production build.
 */
export function npmCommand(env = process.env, execPath = process.execPath, platform = process.platform, exists = existsSync) {
  const path = platform === 'win32' ? win32 : { dirname, join };
  let actual = execPath;
  if (execPath === process.execPath) actual = realpathSync(execPath);
  const candidates = [env.npm_execpath,
    path.join(path.dirname(execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js'),
    path.join(path.dirname(actual), 'node_modules', 'npm', 'bin', 'npm-cli.js'),
    path.join(path.dirname(actual), '..', 'lib', 'node_modules', 'npm', 'bin', 'npm-cli.js')];
  const cli = candidates.find(candidate => candidate && exists(candidate));
  if (cli) return { program: execPath, prefix: [cli], env: { ...env, npm_execpath: cli } };
  if (platform === 'win32') throw Error('Could not locate npm-cli.js. Run npm start using an official Node.js distribution that includes npm.');
  return { program: 'npm', prefix: [], env: { ...env } };
}
