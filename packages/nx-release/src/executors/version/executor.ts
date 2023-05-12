import { catchError, concat, concatMap, defer, lastValueFrom, of, reduce, switchMap } from 'rxjs';

import { calculateChangelogChanges, defaultHeader, getChangelogPath } from './utils/changelog';
import { formatCommitMessage } from './utils/commit';
import { tryPush } from './utils/git';
import { logEvent } from './utils/logger';
import { runPostTargets } from './utils/post-target';
import { shouldSkipPrivateProject } from './utils/project';
import { getDependencyRoots, type DependencyRoot } from './utils/project-dependencies';
import { formatTag, formatTagPrefix } from './utils/tag';
import { tryBump } from './utils/try-bump';
import { versionProject, versionWorkspace, type CommonVersionOptions } from './utils/version';
import { getProject } from './utils/workspace';

import type { ExecutorContext } from '@nrwl/devkit';
import type { VersionExecutorSchema } from './schema';

export default async function version(
  options: VersionExecutorSchema,
  context: ExecutorContext
): Promise<{ success: boolean }> {
  const {
    independent,
    baseBranch,
    commitMessageFormat,
    changelogHeader,
    changelogPreset,
    releaseType,
    allowEmptyRelease,
    tagCommand,
    amend,
    remote,
    preid,
    push,
    trackDeps,
    postTargets,
    tagVersionPrefix,
    skipRootChangelog,
    skipProjectChangelog,
    skipCommit,
    skipCommitTypes,
    skipTag,
    skipPrivate,
    noVerify,
    dryRun
  } = _normalizeOptions(options);
  const workspaceRoot = context.root;
  const projectName = context.projectName;
  const projectRoot = getProject(context).root;
  const skipProject = shouldSkipPrivateProject(projectRoot, skipPrivate);

  let dependencyRoots: DependencyRoot[] = [];

  // Get dependency projects root
  try {
    dependencyRoots = await getDependencyRoots({
      skipProject,
      projectName,
      releaseType,
      trackDeps,
      context
    });
  } catch (error) {
    logEvent({
      event: 'failure',
      level: 'error',
      message: `Failed to determine dependencies.
      Please report an issue: https://github.com/guysenpai/integrated-monorepo`,
      projectName
    });
    return { success: false };
  }

  const tagPrefix = formatTagPrefix({
    tagVersionPrefix,
    projectName,
    independent
  });
  const newVersion$ = tryBump({
    changelogPreset: changelogPreset as string,
    projectRoot,
    dependencyRoots,
    tagPrefix,
    tagVersionPrefix,
    releaseType,
    preid,
    independent,
    allowEmptyRelease,
    skipCommitTypes,
    skipProject,
    projectName
  });
  const runVersion$ = newVersion$.pipe(
    switchMap(newVersion => {
      if (newVersion == null) {
        logEvent({
          event: 'nothing_changed',
          level: 'info',
          message: 'Nothing changed since last release.',
          projectName
        });

        return of({ success: true });
      }

      logEvent({
        event: 'calculate_version_success',
        message: `Calculated new version "${newVersion.version}"`,
        projectName
      });

      const { version, dependencyUpdates } = newVersion;
      const tag = formatTag({ tagPrefix, version });
      const commitMessage = formatCommitMessage({
        projectName,
        commitMessageFormat,
        version
      });
      const options: CommonVersionOptions = {
        newVersion: version,
        tag,
        dryRun,
        trackDeps,
        noVerify,
        tagPrefix,
        changelogPreset,
        changelogHeader,
        workspaceRoot,
        projectName,
        skipProjectChangelog,
        commitMessage,
        tagCommand,
        dependencyUpdates,
        amend,
        skipCommit,
        skipTag,
        skipPrivate,
        workspace: context.projectsConfigurations
      };
      const version$ = defer(() =>
        independent
          ? versionProject({ ...options, skipProject, projectRoot })
          : versionWorkspace({ ...options, skipProject, projectRoot, skipRootChangelog })
      );
      const push$ = defer(() =>
        tryPush({
          tag,
          branch: baseBranch,
          remote,
          noVerify,
          projectName
        })
      );
      const _runPostTargets = (notes: string) =>
        defer(() =>
          runPostTargets({
            context,
            projectName,
            postTargets,
            templateStringContext: {
              dryRun,
              notes,
              version,
              projectName,
              tag,
              previousTag: formatTag({
                tagPrefix,
                version: newVersion.previousVersion
              })
            }
          })
        );
      const changelogPath = getChangelogPath(independent ? projectRoot : workspaceRoot);

      return version$.pipe(
        calculateChangelogChanges({ changelogHeader, changelogPath }),
        concatMap(notes =>
          concat(
            ...(push && dryRun === false && skipProject === false ? [push$] : []),
            ...(dryRun === false && skipProject === false ? [_runPostTargets(notes)] : [])
          )
        ),
        reduce(result => result, { success: true })
      );
    })
  );

  return lastValueFrom(
    runVersion$.pipe(
      catchError(error => {
        logEvent({
          event: 'failure',
          level: 'error',
          message: _toErrorMessage(error),
          projectName
        });
        return of({ success: false });
      })
    )
  );
}

function _toErrorMessage(error: Error): string {
  return error.stack ?? error.toString();
}

/**
 * Returns well formatted options
 *
 * @param options
 * @returns
 */
function _normalizeOptions(options: VersionExecutorSchema) {
  return {
    ...options,
    independent: options.independent as boolean,
    baseBranch: options.baseBranch as string,
    commitMessageFormat: options.commitMessageFormat as string,
    changelogHeader: options.changelogHeader || defaultHeader,
    changelogPreset: options.changelogPreset || 'angular',
    releaseType: options.releaseType,
    allowEmptyRelease: options.allowEmptyRelease as boolean,
    tagVersionPrefix: options.tagPrefix as string,
    tagCommand: options.tagCommand as string,
    remote: options.remote as string,
    amend: options.amend as boolean,
    push: options.push as boolean,
    trackDeps: options.trackDeps as boolean,
    skipRootChangelog: options.skipRootChangelog as boolean,
    skipProjectChangelog: options.skipProjectChangelog as boolean,
    skipCommit: options.skipCommit as boolean,
    skipCommitTypes: options.skipCommitTypes ?? [],
    skipTag: options.skipTag as boolean,
    skipPrivate: options.skipPrivate as boolean,
    noVerify: options.noVerify as boolean,
    dryRun: options.dryRun as boolean
  };
}
