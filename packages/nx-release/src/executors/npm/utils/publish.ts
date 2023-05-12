import { exec } from '../../utils/exec';

import { Observable, throwError } from 'rxjs';
import type { NpmOptions } from '../schema';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

export function publish({
  distPath,
  version,
  tag,
  otp,
  access,
  registry,
  dryRun
}: { distPath: string; version?: string } & NpmOptions): Observable<string> {
  if (version && !dryRun) {
    try {
      _setPackageVersion({ distPath, version });
    } catch (error) {
      return throwError(() => new Error('Error reading package.json file from library build output.'));
    }
  }

  return exec('npm', [
    'publish',
    distPath,
    ...(tag ? ['--tag', tag] : []),
    ...(access ? ['--access', access] : []),
    ...(registry ? ['--registry', registry] : []),
    ...(otp ? ['--otp', otp] : []),
    ...(dryRun ? ['--dry-run'] : [])
  ]);
}

/**
 * Set dist package.json version
 *
 * @param param.distPath
 * @param param.version
 * @returns
 */
function _setPackageVersion({ distPath, version }: { distPath: string; version: string }): void {
  const packageJsonPath = join(distPath, 'package.json');
  const packageJson = JSON.parse(readFileSync(packageJsonPath, { encoding: 'utf-8' }));

  packageJson.version = version;

  return writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2), { encoding: 'utf-8' });
}
