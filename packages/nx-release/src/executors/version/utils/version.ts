import type { ProjectsConfigurations } from '@nrwl/devkit';
import { Observable, concatMap, forkJoin, map, of } from 'rxjs';

import { insertChangelogDependencyUpdates, updateChangelog } from './changelog';
import { commit } from './commit';
import { addToStage, createTag, getLastCommitHash } from './git';
import { eventLog } from './logger';
import { shouldSkipPrivateProject, updatePackageJson } from './project';
import { getProjectRoots } from './workspace';

import type { ChangelogPreset } from '../schema';

export type Version =
  | { type: 'project'; version: string | null }
  | { type: 'dependency'; version: string | null; dependencyName: string };

export interface CommonVersionOptions {
  tag: string;
  dryRun: boolean;
  trackDeps: boolean;
  newVersion: string;
  noVerify: boolean;
  workspaceRoot: string;
  tagPrefix: string;
  changelogHeader: string;
  skipCommit: boolean;
  skipTag: boolean;
  commitMessage: string;
  tagCommand?: string;
  amend?: boolean;
  projectName: string;
  skipPrivate: boolean;
  skipProjectChangelog: boolean;
  dependencyUpdates: Version[];
  changelogPreset: ChangelogPreset;
  workspace?: ProjectsConfigurations;
}

/**
 * Synced versioning
 *
 * @param options
 * @returns
 */
export function versionWorkspace({
  skipRootChangelog,
  commitMessage,
  newVersion,
  dryRun,
  noVerify,
  projectName,
  tag,
  skipProject,
  skipCommit,
  skipTag,
  projectRoot,
  amend,
  ...options
}: {
  skipRootChangelog: boolean;
  projectRoot: string;
  skipProject: boolean;
} & CommonVersionOptions) {
  const projectRoots = getProjectRoots(options.workspaceRoot, options.workspace);

  return forkJoin([
    _generateChangelogs({
      projectRoots,
      skipRootChangelog,
      commitMessage,
      newVersion,
      dryRun,
      noVerify,
      projectName,
      skipCommit,
      skipTag,
      tag,
      ...options
    }),
    forkJoin(
      projectRoots.map(projectRoot =>
        updatePackageJson({
          newVersion,
          projectRoot,
          projectName,
          skipProject,
          dryRun
        })
      )
    ).pipe(map(paths => paths.filter(_isNotNull)))
  ]).pipe(
    map(paths => paths.flat()),
    concatMap(paths => addToStage({ paths, dryRun })),
    concatMap(() =>
      commit({
        skipCommit: skipProject || skipCommit,
        dryRun,
        noVerify,
        commitMessage,
        projectName,
        amend
      })
    ),
    concatMap(() => getLastCommitHash(projectRoot)),
    concatMap(commitHash =>
      createTag({
        dryRun,
        tag,
        skipTag: skipProject || skipTag,
        commitHash,
        commitMessage,
        projectName
      })
    )
  );
}

/**
 * Independent versioning
 *
 * @param options
 * @returns
 */
export function versionProject({
  workspaceRoot,
  projectRoot,
  newVersion,
  dryRun,
  commitMessage,
  tagCommand,
  noVerify,
  tagPrefix,
  projectName,
  skipProject,
  skipCommit,
  skipTag,
  tag,
  amend,
  ...options
}: {
  projectRoot: string;
  skipProject: boolean;
} & CommonVersionOptions) {
  return _generateChangelogs({
    projectName,
    projectRoots: [projectRoot],
    skipRootChangelog: true,
    workspaceRoot,
    newVersion,
    commitMessage,
    dryRun,
    noVerify,
    skipCommit,
    skipTag,
    tagPrefix,
    tag,
    ...options
  }).pipe(
    concatMap(changelogPaths =>
      changelogPaths.length === 1
        ? insertChangelogDependencyUpdates({
            changelogPath: changelogPaths[0],
            version: newVersion,
            dryRun,
            dependencyUpdates: options.dependencyUpdates
          }).pipe(concatMap(changelogPath => addToStage({ paths: [changelogPath], dryRun })))
        : of(undefined)
    ),
    concatMap(() =>
      updatePackageJson({
        newVersion,
        projectRoot,
        projectName,
        skipProject,
        dryRun
      }).pipe(
        concatMap(packageFile => (packageFile !== null ? addToStage({ paths: [packageFile], dryRun }) : of(undefined)))
      )
    ),
    concatMap(() =>
      commit({
        skipCommit: skipProject || skipCommit,
        dryRun,
        noVerify,
        commitMessage,
        projectName,
        amend
      })
    ),
    concatMap(() => getLastCommitHash(projectRoot)),
    concatMap(commitHash =>
      createTag({
        dryRun,
        tag,
        skipTag: skipProject || skipTag,
        commitHash,
        commitMessage,
        projectName,
        tagCommand
      })
    )
  );
}

/**
 * Generate changelog file
 *
 * @param options
 * @returns
 */
function _generateChangelogs({
  projectRoots,
  workspaceRoot,
  skipRootChangelog,
  skipProjectChangelog,
  skipPrivate,
  projectName,
  ...options
}: {
  skipRootChangelog: boolean;
  projectRoots: string[];
} & CommonVersionOptions): Observable<string[]> {
  const changelogRoots = projectRoots
    .filter(projectRoot => !shouldSkipPrivateProject(projectRoot, skipPrivate))
    .filter(projectRoot => !(skipProjectChangelog && projectRoot !== workspaceRoot))
    .filter(projectRoot => !(skipRootChangelog && projectRoot === workspaceRoot));

  console.log(changelogRoots);

  if (changelogRoots.length === 0) {
    return of([]);
  }

  return forkJoin(
    changelogRoots.map(projectRoot =>
      updateChangelog({
        projectRoot,
        ...options
      }).pipe(
        eventLog({
          event: 'changelog_success',
          message: `Generated CHANGELOG.md`,
          projectName
        })
      )
    )
  );
}

/**
 * Check if path is not null
 *
 * @param path
 * @returns
 * @private
 */
function _isNotNull(path: string | null): path is string {
  return path !== null;
}
