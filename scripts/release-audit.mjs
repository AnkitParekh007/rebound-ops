/**
 * Lightweight public release hygiene check — not a vulnerability scan.
 * Refuse accidentally tracked local records, keys and private feedback reports.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

let paths;
try {
  paths = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' })
    .split('\0').filter(Boolean);
} catch {
  console.error('Release audit requires a Git checkout.');
  process.exitCode = 1;
  process.exit();
}

const privatePath = /(^|\/)(?:\.env(?:$|\.(?!example$)[^/]+$)|id_rsa|id_ed25519|credentials\.json|service-account\.json|reboundops-session\.json|reboundops-private-pilot-feedback\.md)$/i;
const sensitiveSuffix = /\.(?:pem|p12|pfx|key)$/i;
const violations = [];
for (const path of paths) {
  if (privatePath.test(path) || sensitiveSuffix.test(path)) {
    violations.push(path + ': private-looking file is tracked');
    continue;
  }
  try {
    const body = readFileSync(path);
    if (body.byteLength <= 1024 * 1024) {
      const content = body.toString('utf8');
      if (/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(content) ||
          /sk-ant-api\d{2}-[A-Za-z0-9_-]{20,}/.test(content)) {
        violations.push(path + ': content resembles a private key');
      }
    }
  } catch {
    violations.push(path + ': could not examine tracked file');
  }
}
for (const file of ['README.md', 'LICENSE', 'SECURITY.md',
                    'docs/privacy.md', 'docs/release-checklist.md']) {
  if (!paths.includes(file)) violations.push(file + ': required release document missing');
}

if (violations.length) {
  console.error('Release hygiene check failed:\n' + violations.map(x => '- ' + x).join('\n'));
  process.exitCode = 1;
} else {
  console.log('Release hygiene check passed (' + paths.length +
    ' tracked files inspected). This does not certify absence of vulnerabilities.');
}
