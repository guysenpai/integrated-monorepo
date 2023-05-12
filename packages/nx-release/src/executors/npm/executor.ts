import { logger, type ExecutorContext } from '@nrwl/devkit';
import { catchError, concatMap, defer, lastValueFrom, map, of } from 'rxjs';

import { buildProject } from './utils/build-project';
import { getDistPath } from './utils/dist-path';
import { publish } from './utils/publish';

import type { NpmExecutorSchema } from './schema';

export default async function runExecutor(
  options: NpmExecutorSchema,
  context: ExecutorContext
): Promise<{ success: boolean }> {
  const { distFolderPath, buildTarget, noBuild, version, npmOptions } = _normalizeOptions(options);

  const publish$ = defer(() => buildProject({ context, buildTarget, noBuild })).pipe(
    concatMap(targetDescription =>
      getDistPath({
        targetDescription,
        distFolderPath,
        context
      })
    ),
    concatMap(distPath => publish({ distPath, version, ...npmOptions }))
  );

  return lastValueFrom(
    publish$.pipe(
      map(() => ({ success: true })),
      catchError(error => {
        logger.error(error);
        return of({ success: false });
      })
    )
  );
}

/**
 * Normalize options
 *
 * @param options
 * @returns
 * @private
 */
function _normalizeOptions({
  distFolderPath,
  buildTarget,
  noBuild,
  version,
  tag,
  access,
  otp,
  registry,
  dryRun
}: NpmExecutorSchema) {
  return {
    distFolderPath,
    buildTarget,
    noBuild,
    version,
    npmOptions: {
      access,
      tag,
      otp,
      dryRun,
      registry
    }
  };
}
