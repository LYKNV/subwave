// `subwave setup` — delegates to the existing scripts/setup.mjs wizard.
//
// The wizard is already a solid implementation of the credential-gathering
// + bash-shell-out flow; re-porting it would be churn-for-the-sake-of-it.
// We just import its main() and call it. If we later want to share UI
// helpers between setup and the rest of the CLI, we can port it then.
//
// Note: setup is the one place we *don't* want menu-mode Esc behaviour —
// Esc should let Clack cancel the wizard outright, since the menu loop
// is not the parent. Callers should ensure setMenuMode(false) before
// invoking this.

import { resolve } from 'node:path';
import { REPO_ROOT } from '../util.ts';

export async function runSetupCommand(): Promise<void> {
  // Dynamic import so the heavy setup wizard isn't loaded on every CLI
  // startup. The file is plain JS ESM; tsx happily imports it.
  const setupPath = resolve(REPO_ROOT, 'scripts', 'setup.mjs');
  const mod = await import(setupPath) as { main: () => Promise<void> };
  await mod.main();
}
