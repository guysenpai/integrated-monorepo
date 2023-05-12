import detectIndent from 'detect-indent';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { Observable, map, of, switchMap } from 'rxjs';

import { readFileIfExist, readJsonFile, writeFile } from './filesystem';
import { eventLog } from './logger';

/**
 * Get package.json path from projectRoot
 *
 * @param projectRoot
 * @returns
 */
export function getPackageJsonPath(projectRoot: string): string {
  return resolve(projectRoot, 'package.json');
}

/**
 * Read package.json content from projectRoot
 *
 * @param projectRoot
 * @returns
 */
export function readPackageJson(projectRoot: string): Observable<{ version?: string }> {
  return readJsonFile(getPackageJsonPath(projectRoot));
}

/**
 * Safely update package.json file
 *
 * @param param.newVersion
 * @param param.projectRoot
 * @param param.projectName
 * @param param.dryRun
 * @returns
 */
export function updatePackageJson({
  newVersion,
  projectRoot,
  projectName,
  skipProject,
  dryRun
}: {
  newVersion: string;
  projectRoot: string;
  projectName: string;
  skipProject: boolean;
  dryRun: boolean;
}): Observable<string | null> {
  if (dryRun || skipProject) {
    return of(null);
  }

  const path = getPackageJsonPath(projectRoot);

  return readFileIfExist(path).pipe(
    switchMap(packageJson => {
      if (!packageJson.length) {
        return of(null);
      }

      const newPackageJson = _updatePackageVersion(packageJson, newVersion);

      return writeFile(path, newPackageJson).pipe(
        eventLog({
          event: 'package_json_success',
          message: 'Updated package.json version',
          projectName
        }),
        map(() => path)
      );
    })
  );
}

/**
 * Check if we should skip private project
 *
 * @param projectRoot
 * @param skipPrivate
 * @returns
 */
export function shouldSkipPrivateProject(projectRoot: string, skipPrivate: boolean): boolean {
  const path = getPackageJsonPath(projectRoot);

  if (existsSync(path)) {
    return false;
  }

  const packageJson = JSON.parse(readFileSync(path, { encoding: 'utf-8' }));

  return packageJson?.private && skipPrivate;
}

/**
 * Update package.json version
 *
 * @param packageJson
 * @param version
 * @returns
 * @private
 */
function _updatePackageVersion(packageJson: string, version: string): string {
  const data = JSON.parse(packageJson);
  const { indent } = detectIndent(packageJson);

  return _stringifyJson({ ...data, version }, indent);
}

/**
 * Converts JSON data to string and adds new line
 *
 * @param data
 * @param indent
 * @returns
 * @private
 */
function _stringifyJson(data: unknown, indent: string | number): string {
  return JSON.stringify(data, null, indent).concat('\n');
}
