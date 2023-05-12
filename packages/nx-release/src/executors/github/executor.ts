import { logger } from '@nrwl/devkit';
import { catchError, lastValueFrom, map, of } from 'rxjs';

import { exec } from '../utils/exec';

import type { GithubExecutorSchema } from './schema';

export default async function runExecutor({
  tag,
  files,
  notes,
  notesFile,
  target,
  draft,
  title,
  prerelease,
  discussionCategory,
  repo,
  generateNotes,
  notesStartTag,
  verifyTag,
  latest,
  assets
}: GithubExecutorSchema): Promise<{ success: boolean }> {
  const createRelease$ = exec('gh', [
    'release',
    'create',
    tag,
    ...(files ? files : []),
    ...(notes ? ['--notes', notes] : []),
    ...(notesFile ? ['--notes-file', notesFile] : []),
    ...(target ? ['--target', target] : []),
    ...(draft ? ['--draft'] : []),
    ...(title ? ['--title', title] : []),
    ...(prerelease ? ['--prerelease'] : []),
    ...(discussionCategory ? ['--discussion-category', discussionCategory] : []),
    ...(repo ? ['--repo', repo] : []),
    ...(generateNotes ? ['--generate-notes'] : []),
    ...(notesStartTag ? ['--notes-start-tag', notesStartTag] : []),
    ...(verifyTag ? ['--verify-tag'] : []),
    ...(latest ? ['--latest'] : []),
    ...(assets
      ? assets.map(asset =>
          typeof asset === 'string' ? asset : asset.name ? `${asset.path}#${asset.name}` : asset.path
        )
      : [])
  ]).pipe(
    map(() => ({ success: true })),
    catchError(error => {
      logger.error(error);
      return of({ success: false });
    })
  );

  return lastValueFrom(createRelease$);
}
