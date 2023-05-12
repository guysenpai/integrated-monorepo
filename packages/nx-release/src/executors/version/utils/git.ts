import gitRawCommits, { type GitOptions } from 'git-raw-commits';
import { EMPTY, Observable, catchError, last, map, scan, startWith, throwError } from 'rxjs';

import { exec } from '../../utils/exec';
import { eventLog, logEvent } from './logger';
import { createTemplateString } from './template-string';

/**
 * Get the list of commit bodies since `since` commit.
 *
 * @param param.projectRoot
 * @param param.since
 * @returns
 */
export function getCommits({ projectRoot, since }: { projectRoot: string; since?: string }): Observable<string[]> {
  return _getFormattedCommits({
    since,
    projectRoot,
    ignoreMergeCommits: true,
    format: '%B'
  });
}

/**
 * Get the last commit hash
 *
 * @param projectRoot
 * @returns
 */
export function getLastCommitHash(projectRoot: string): Observable<string> {
  return _getFormattedCommits({
    projectRoot,
    ignoreMergeCommits: false,
    format: '%H'
  }).pipe(map(([commit]) => commit.trim()));
}

/**
 * Execute a `git push` command
 *
 * @param param.remote
 * @param param.branch
 * @param param.noVerify
 * @param param.projectName
 * @param param.tag
 * @returns
 */
export function tryPush({
  remote,
  branch,
  noVerify,
  projectName,
  tag
}: {
  remote: string;
  branch: string;
  noVerify: boolean;
  projectName: string;
  tag: string;
}): Observable<string> {
  if (remote == null || branch == null) {
    return throwError(() => new Error('Missing option --git-remote or --base-branch'));
  }

  const gitPushOptions = [...(noVerify ? ['--no-verify'] : [])];

  return exec('git', ['push', ...gitPushOptions, '--atomic', remote, branch, tag]).pipe(
    catchError(error => {
      if (/atomic/.test(error)) {
        logEvent({
          event: 'warning',
          level: 'warn',
          message: 'Git push --atomic failed, attempting non-atomic push.',
          projectName
        });

        return exec('git', ['push', ...gitPushOptions, remote, branch, tag]);
      }

      throw error;
    }),
    eventLog({
      event: 'push_success',
      message: `Push to "${remote}" "${branch}"`,
      projectName
    })
  );
}

/**
 * Add files to git staged files
 *
 * @param param.paths
 * @param param.dryRun
 * @returns
 */
export function addToStage({ paths, dryRun }: { paths: string[]; dryRun: boolean }): Observable<void> {
  if (paths.length === 0) {
    return EMPTY;
  }

  const gitAddOptions = [...(dryRun ? ['--dry-run'] : []), ...paths];

  return exec('git', ['add', ...gitAddOptions]).pipe<void>(map(() => void 0));
}

/**
 * Get the first commit ref
 *
 * @returns
 */
export function getFirstCommitRef(): Observable<string> {
  return exec('git', ['rev-list', '--max-parents=0', 'HEAD']).pipe(
    map(output =>
      output
        .split('\n')
        .map(c => c.trim())
        .filter(Boolean)
        .pop()
    )
  );
}

export function createTag({
  dryRun,
  skipTag,
  tag,
  commitHash,
  commitMessage,
  projectName,
  tagCommand,
  templateStringContext
}: {
  dryRun: boolean;
  skipTag: boolean;
  tag: string;
  commitHash: string;
  commitMessage: string;
  projectName: string;
  tagCommand?: string;
  templateStringContext?: Record<string, unknown>;
}): Observable<string> {
  if (dryRun || skipTag) {
    return EMPTY;
  }

  if (tagCommand && !tagCommand.startsWith('git')) {
    return throwError(() => new Error(`The git tag command is not a valid command`));
  }

  if (tagCommand && tagCommand.startsWith('git')) {
    const [cmd, ...args] = _getFormattedTagCommand(tagCommand, {
      ...(templateStringContext || {}),
      tag,
      hash: commitHash,
      message: commitMessage,
      projectName
    });

    return exec(cmd, args).pipe(
      catchError(error => {
        if (/not a git command/.test(error)) {
          throw new Error(`Failed to execute the git tag command, this command is not a git command.`);
        }

        throw error;
      })
    );
  }

  return exec('git', ['tag', '-a', tag, commitHash, '-m', commitMessage]).pipe(
    catchError(error => {
      if (/already exists/.test(error)) {
        throw new Error(`Failed to tag "${tag}", this tag already exists.
            This error occurs because the same version was previously created but the tag does not point to a commit referenced in your base branch.
            Please delete the tag by running "git tag -d ${tag}", make sure the tag has been removed from the remote repository as well and run this command again.`);
      }

      throw error;
    }),
    map(() => tag),
    eventLog({
      event: 'tag_success',
      message: `Tagged "${tag}"`,
      projectName
    })
  );
}

/**
 * Return formatted tag command args
 *
 * @param tagCommand
 * @param templateStringContext
 * @returns
 */
function _getFormattedTagCommand(tagCommand: string, templateStringContext: Record<string, unknown>): string[] {
  return tagCommand.split(' ').map(arg => createTemplateString(arg, templateStringContext));
}

/**
 * Get the list of formatted commits since `since` commit.
 *
 * @param param.projectRoot
 * @param param.format
 * @param param.ignoreMergeCommits
 * @param param.since
 * @returns
 * @private
 */
function _getFormattedCommits({
  projectRoot,
  format,
  ignoreMergeCommits,
  since = ''
}: {
  projectRoot: string;
  format: string;
  ignoreMergeCommits: boolean;
  since?: string;
}): Observable<string[]> {
  return new Observable<string>(observer => {
    const params: GitOptions = {
      from: since,
      format,
      path: projectRoot,
      'full-history': true
    };

    if (ignoreMergeCommits) {
      params['no-merges'] = ignoreMergeCommits;
    }

    gitRawCommits(params)
      .on('data', (data: string) => observer.next(data))
      .on('error', (error: Error) => observer.error(error))
      .on('close', () => observer.complete())
      .on('finish', () => observer.complete());
  }).pipe(
    scan((commits, commit) => [...commits, commit.toString()], [] as string[]),
    startWith([]),
    last()
  );
}
