import { map, of, type Observable } from 'rxjs';

import { exec } from '../../utils/exec';
import { eventLog } from './logger';
import { createTemplateString } from './template-string';

/**
 * Execute a git commit
 *
 * @param param.dryRun
 * @param param.noVerify
 * @param param.skipCommit
 * @param param.commitMessage
 * @param param.projectName
 * @returns
 */
export function commit({
  dryRun,
  noVerify,
  skipCommit,
  commitMessage,
  projectName,
  amend
}: {
  dryRun: boolean;
  noVerify: boolean;
  skipCommit: boolean;
  commitMessage: string;
  projectName: string;
  amend?: boolean;
}): Observable<void> {
  if (dryRun || skipCommit) {
    return of(void 0);
  }

  return exec('git', [
    'commit',
    ...(noVerify ? ['--no-verify'] : []),
    ...(amend ? ['--amend', '--no-edit'] : ['-m', commitMessage])
  ]).pipe(
    map(() => void 0),
    eventLog({
      event: 'commit_success',
      message: `Committed "${commitMessage}".`,
      projectName
    })
  );
}

/**
 * Format commit message
 *
 * @param param.commitMessageFormat
 * @param param.projectName
 * @param param.version
 * @returns
 */
export function formatCommitMessage({
  commitMessageFormat,
  projectName,
  version
}: {
  commitMessageFormat: string;
  version: string;
  projectName: string;
}): string {
  return createTemplateString(commitMessageFormat, {
    projectName,
    version
  });
}
