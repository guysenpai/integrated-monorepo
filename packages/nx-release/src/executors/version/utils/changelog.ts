import { resolve } from 'path';
import {
  combineLatestWith,
  concatMap,
  defer,
  lastValueFrom,
  map,
  of,
  switchMap,
  type Observable,
  type OperatorFunction
} from 'rxjs';

import { diff } from './diff';
import { readFile, readFileIfExist, writeFile } from './filesystem';
import { writeChangelog } from './write-changelog';

import type { ChangelogPreset } from '../schema';
import type { Version } from './version';

export const defaultHeader = `# Changelog

This file was generated with [@guysenpai/semver](https://github.com/guysenpai/semver).`;

/**
 * Get changelog path
 *
 * @param projectRoot
 * @returns
 */
export function getChangelogPath(projectRoot: string) {
  return resolve(projectRoot, 'CHANGELOG.md');
}

/**
 * Update changelog file
 *
 * @param param.changelogHeader
 * @param param.changelogPreset
 * @param param.projectRoot
 * @param param.dryRun
 * @param param.newVersion
 * @param param.tagPrefix
 * @returns
 */
export function updateChangelog({
  changelogHeader,
  changelogPreset,
  projectRoot,
  dryRun,
  newVersion,
  tagPrefix
}: {
  changelogHeader: string;
  changelogPreset: ChangelogPreset;
  projectRoot: string;
  dryRun: boolean;
  newVersion: string;
  tagPrefix: string;
}): Observable<string> {
  return defer(async () => {
    const changelogPath = getChangelogPath(projectRoot);

    await writeChangelog({
      changelogHeader,
      changelogPath,
      changelogPreset,
      dryRun,
      tagPrefix,
      projectRoot,
      newVersion
    });

    return changelogPath;
  });
}

/**
 * Add changelog dependency updates to the changelog
 *
 * @param param.changelogPath
 * @param param.version
 * @param param.dryRun
 * @param param.dependencyUpdates
 * @returns
 */
export function insertChangelogDependencyUpdates({
  changelogPath,
  version,
  dryRun,
  dependencyUpdates
}: {
  changelogPath: string;
  version: string;
  dryRun: boolean;
  dependencyUpdates: Version[];
}): Observable<string> {
  return of(!dependencyUpdates.length || dryRun).pipe(
    switchMap(skipDependencyUpdates => {
      if (skipDependencyUpdates) {
        return of(changelogPath);
      }

      return readFile(changelogPath).pipe(
        map(changelog =>
          _calculateDependencyUpdates({
            changelog,
            version,
            dependencyUpdates
          })
        ),
        switchMap(changelog => writeFile(changelogPath, changelog)),
        map(() => changelogPath)
      );
    })
  );
}

/**
 * RxJs operator that returns the diff between changelogs
 *
 * @param param.changelogPath
 * @param param.changelogHeader
 * @returns
 */
export function calculateChangelogChanges<T>({
  changelogPath,
  changelogHeader
}: {
  changelogPath: string;
  changelogHeader: string;
}): OperatorFunction<T, string> {
  return source => {
    return readFileIfExist(changelogPath, changelogHeader).pipe(
      combineLatestWith(source),
      concatMap(async ([input]) => {
        const output = await lastValueFrom(readFileIfExist(changelogPath, changelogHeader));

        return diff(input, output);
      })
    );
  };
}

/**
 * Return the changelog string for dependency updates
 *
 * @param param.changelog
 * @param param.version
 * @param param.dependencyUpdates
 * @returns
 */
function _calculateDependencyUpdates({
  changelog,
  version,
  dependencyUpdates
}: {
  changelog: string;
  version: string;
  dependencyUpdates: Version[];
}): string {
  const match = changelog.match(new RegExp(`##? \\[?${version}\\]? ?\\(.*\\)`));

  if (match && match.index !== undefined) {
    const dependencyNames = dependencyUpdates.reduce((acc, ver) => {
      if (ver.type === 'dependency') {
        acc.push(`* \`${ver.dependencyName}\` updated to version \`${ver.version}\``);
      }
      return acc;
    }, [] as string[]);

    changelog =
      `${changelog.substring(0, match.index + match[0].length)}` +
      `\n\n### Dependency Updates\n\n${dependencyNames.join('\n')}\n` +
      `${changelog.substring(match.index + match[0].length + 2)}`;
  }

  return changelog;
}
