import { logger } from '@nrwl/devkit';
import { catchError, lastValueFrom, map, of } from 'rxjs';

import { exec } from '../utils/exec';

import type { GitlabExecutorSchema } from './schema';

export default async function runExecutor({
  tag,
  ref,
  assets,
  name,
  notes,
  notesFile,
  milestones,
  releasedAt,
  repo
}: GitlabExecutorSchema): Promise<{ success: boolean }> {
  const createRelease$ = exec('glab', [
    'release',
    'create',
    tag,
    ...(ref ? ['--ref', ref] : []),
    ...(name ? ['--name', name] : []),
    ...(notes ? ['--notes', notes] : []),
    ...(notesFile ? ['--notes-file', notesFile] : []),
    ...(milestones ? milestones.map(milestone => ['--milestone', milestone]).flat() : []),
    ...(releasedAt ? ['--released-at', releasedAt] : []),
    ...(repo ? ['--repo', repo] : []),
    ...(assets
      ? assets
          .map(asset =>
            typeof asset === 'string'
              ? [asset]
              : asset.name && asset.type && asset.filepath
              ? [
                  '--assets-links',
                  `[{ "name": "${asset.name}", "url": "${asset.url}", "link_type": "${asset.type}", "filepath": "${asset.filepath}" }]`
                ]
              : asset.name && asset.type
              ? [`${asset.url}#${asset.name}#${asset.type}`]
              : asset.name
              ? [`${asset.url}#${asset.name}`]
              : [asset.url]
          )
          .flat()
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
