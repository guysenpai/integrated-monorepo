import conventionalCommitsParser from 'conventional-commits-parser';
import conventionalRecommendedBump from 'conventional-recommended-bump';
import {
  catchError,
  defaultIfEmpty,
  defer,
  forkJoin,
  iif,
  map,
  of,
  shareReplay,
  switchMap,
  type Observable
} from 'rxjs';
import semver, { type ReleaseType } from 'semver';
import { promisify } from 'util';

import { getLastVersion } from './get-last-version';
import { getCommits, getFirstCommitRef } from './git';
import { logEvent } from './logger';
import { formatTag, formatTagPrefix } from './tag';

import type { DependencyRoot } from './project-dependencies';
import type { Version } from './version';

export interface NewVersion {
  version: string;
  previousVersion: string;
  dependencyUpdates: Version[];
}

const initialVersion = '0.0.0';

/**
 * Return the new version or null if nothing changed.
 *
 * @param param.changelogPreset
 * @param param.projectRoot
 * @param param.tagPrefix
 * @param param.dependencyRoots
 * @param param.releaseType
 * @param param.preid
 * @param param.tagVersionPrefix
 * @param param.independent
 * @param param.allowEmptyRelease
 * @param param.skipCommitTypes
 * @param param.projectName
 */
export function tryBump({
  changelogPreset,
  projectRoot,
  tagPrefix,
  dependencyRoots = [],
  releaseType,
  preid,
  tagVersionPrefix,
  independent,
  allowEmptyRelease,
  skipCommitTypes,
  skipProject,
  projectName
}: {
  changelogPreset: string;
  projectRoot: string;
  tagPrefix: string;
  dependencyRoots?: DependencyRoot[];
  releaseType?: ReleaseType;
  preid?: string;
  tagVersionPrefix?: string | null;
  independent: boolean;
  allowEmptyRelease?: boolean;
  skipCommitTypes: string[];
  skipProject?: boolean;
  projectName: string;
}): Observable<NewVersion | null> {
  if (skipProject) {
    return of(null);
  }

  const { commits$, lastVersion$, lastVersionGitRef$ } = _getProjectVersion({
    tagPrefix,
    projectRoot,
    releaseType,
    projectName,
    preid
  });

  return forkJoin([commits$, lastVersion$, lastVersionGitRef$]).pipe(
    switchMap(([commits, lastVersion, lastVersionGitRef]) => {
      // If release type is manually specified,
      // we just release even if there are no changes
      if (releaseType !== undefined) {
        return _manualBump({
          since: lastVersion,
          releaseType,
          preid
        }).pipe(
          map(version =>
            version
              ? ({
                  version,
                  previousVersion: lastVersion,
                  dependencyUpdates: []
                } satisfies NewVersion)
              : null
          )
        );
      }

      const dependencyVersions$ = _getDependencyVersions({
        lastVersionGitRef,
        dependencyRoots,
        changelogPreset,
        releaseType,
        tagVersionPrefix,
        skipCommitTypes,
        independent,
        projectName,
        preid
      });
      const projectBump$ = _semverBump({
        since: lastVersion,
        changelogPreset,
        projectRoot,
        tagPrefix
      }).pipe(map(version => ({ type: 'project', version } satisfies Version)));

      return forkJoin([projectBump$, dependencyVersions$]).pipe(
        switchMap(([projectVersion, dependencyVersions]) => {
          const dependencyUpdates = dependencyVersions.filter(_isNewVersion);
          const newVersion: NewVersion = {
            version: projectVersion.version || lastVersion,
            previousVersion: lastVersion,
            dependencyUpdates
          };

          // Bump patch version if there are no changes,
          // but dependency updates are available
          if (projectVersion.version === null && dependencyUpdates.length) {
            return _manualBump({
              since: lastVersion,
              releaseType: 'patch',
              preid
            }).pipe(
              map(version =>
                version
                  ? ({
                      ...newVersion,
                      version: version || lastVersion,
                      previousVersion: lastVersion
                    } satisfies NewVersion)
                  : null
              )
            );
          }

          const filteredCommits = commits.filter(commit => _shouldCommitBeCalculated({ commit, skipCommitTypes }));

          // No commits since last release & no dependency updates
          // so don't bump if the `allowEmptyRelease` flag is not present
          if (!dependencyUpdates.length && !filteredCommits.length && !allowEmptyRelease) {
            return of(null);
          }

          return of(newVersion);
        })
      );
    })
  );
}

/**
 * Semver bump
 *
 * @param param.since
 * @param param.changelogPreset
 * @param param.projectRoot
 * @param param.tagPrefix
 * @returns
 * @private
 */
function _semverBump({
  since,
  changelogPreset,
  projectRoot,
  tagPrefix
}: {
  since: string;
  changelogPreset: string;
  projectRoot: string;
  tagPrefix: string;
}): Observable<string> {
  return defer(async () => {
    const recommended = (await promisify(conventionalRecommendedBump)({
      path: projectRoot,
      preset: changelogPreset,
      tagPrefix
    })) as { releaseType: ReleaseType };
    const { releaseType } = recommended;

    return semver.inc(since, releaseType);
  });
}

/**
 * Manual bump
 *
 * @param param.since
 * @param param.releaseType
 * @param param.preid
 * @returns
 */
function _manualBump({
  since,
  releaseType,
  preid
}: {
  since: string;
  releaseType: ReleaseType;
  preid: string;
}): Observable<string> {
  return defer(() => {
    const hasPreid = ['premajor', 'preminor', 'prepatch', 'prerelease'].includes(releaseType) && preid !== null;
    const semverArgs: [string, ReleaseType, ...string[]] = [since, releaseType, ...(hasPreid ? [preid] : [])];

    return of(semver.inc(...semverArgs));
  });
}

/**
 * Check if commit could be calculated
 *
 * @param param.commit
 * @param param.skipCommitTypes
 * @returns
 * @private
 */
function _shouldCommitBeCalculated({
  commit,
  skipCommitTypes
}: {
  commit: string;
  skipCommitTypes: string[];
}): boolean {
  const { type } = conventionalCommitsParser.sync(commit, {});
  const shouldSkip = skipCommitTypes.some(typeToSkip => typeToSkip === type);

  return !shouldSkip;
}

/**
 * Get project version
 *
 * @param param.tagPrefix
 * @param param.projectRoot
 * @param param.releaseType
 * @param param.since
 * @param param.projectName
 * @param param.preid
 * @returns
 */
function _getProjectVersion({
  tagPrefix,
  projectRoot,
  releaseType,
  since,
  projectName,
  preid
}: {
  tagPrefix: string;
  projectRoot: string;
  releaseType?: ReleaseType;
  since?: string;
  projectName: string;
  preid?: string;
}) {
  const lastVersion$ = getLastVersion({
    tagPrefix,
    includePrerelease: releaseType === 'prerelease',
    preid
  }).pipe(
    catchError(() => {
      logEvent({
        event: 'warning',
        level: 'warn',
        message: `No previous version tag found, fallback to version 0.0.0.
        New version will be calculated based on all changes since first commit.
        If your project is already versioned, please tag the latest release commit with ${tagPrefix}x.y.z and run this command again.`,
        projectName
      });
      return of(initialVersion);
    }),
    shareReplay({
      refCount: true,
      bufferSize: 1
    })
  );

  const lastVersionGitRef$ = lastVersion$.pipe(
    // If lastVersion equals 0.0.0 it means no tag exist,
    // then get the first commit ref to compute the initial version
    switchMap(lastVersion =>
      iif(() => _isInitialVersion(lastVersion), getFirstCommitRef(), of(formatTag({ tagPrefix, version: lastVersion })))
    )
  );

  const commits$ = lastVersionGitRef$.pipe(
    switchMap(lastVersionGitRef =>
      getCommits({
        projectRoot,
        since: since ?? lastVersionGitRef
      })
    )
  );

  return {
    commits$,
    lastVersion$,
    lastVersionGitRef$
  };
}

/**
 * Get the version of the project dependencies
 *
 * @param param.changelogPreset
 * @param param.lastVersionGitRef
 * @param param.dependencyRoots
 * @param param.releaseType
 * @param param.skipCommitTypes
 * @param param.tagVersionPrefix
 * @param param.independent
 * @param param.projectName
 * @param param.preid
 * @returns
 * @private
 */
function _getDependencyVersions({
  changelogPreset,
  lastVersionGitRef,
  dependencyRoots,
  releaseType,
  skipCommitTypes,
  tagVersionPrefix,
  independent,
  projectName,
  preid
}: {
  changelogPreset: string;
  lastVersionGitRef: string;
  dependencyRoots: DependencyRoot[];
  releaseType?: ReleaseType;
  skipCommitTypes: string[];
  tagVersionPrefix?: string | null;
  independent: boolean;
  projectName: string;
  preid: string;
}): Observable<Version[]> {
  return forkJoin(
    dependencyRoots.map(({ path: projectRoot, name: dependencyName }) => {
      // Get dependency version changes since last project version
      const tagPrefix = formatTagPrefix({ tagVersionPrefix, projectName: dependencyName, independent });
      const { lastVersion$, commits$ } = _getProjectVersion({
        tagPrefix,
        projectRoot,
        releaseType,
        since: lastVersionGitRef,
        projectName,
        preid
      });

      return forkJoin([lastVersion$, commits$]).pipe(
        switchMap(([dependencyLastVersion, commits]) => {
          const filteredCommits = commits.filter(commit => _shouldCommitBeCalculated({ commit, skipCommitTypes }));

          if (filteredCommits.length === 0) {
            return of({
              type: 'dependency',
              version: null,
              dependencyName
            } satisfies Version);
          }

          // Dependency has changes but has no tagged version
          if (_isInitialVersion(dependencyLastVersion)) {
            return _semverBump({
              since: dependencyLastVersion,
              changelogPreset,
              projectRoot,
              tagPrefix
            }).pipe(
              map(
                version =>
                  ({
                    type: 'dependency',
                    version,
                    dependencyName
                  } satisfies Version)
              )
            );
          }

          // Return the changed version of dependency since last commit within project
          return of({
            type: 'dependency',
            version: dependencyLastVersion,
            dependencyName
          } satisfies Version);
        })
      );
    })
  ).pipe(defaultIfEmpty([]));
}

/**
 * Check if the given version is a new version
 *
 * @param version.version
 * @returns
 * @private
 */
function _isNewVersion({ version }: Version): boolean {
  return version !== null && version !== initialVersion;
}

/**
 * Check if the last version is the initial version
 *
 * @param lastVersion
 * @returns
 * @private
 */
function _isInitialVersion(lastVersion: string): boolean {
  return lastVersion === initialVersion;
}
