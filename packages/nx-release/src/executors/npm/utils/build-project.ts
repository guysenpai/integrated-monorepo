import { logger, parseTargetString, runExecutor, type ExecutorContext, type Target } from '@nrwl/devkit';
import { Observable, defer, of } from 'rxjs';

/**
 * Build or not project and return target description
 *
 * @param param.context
 * @param param.noBuild
 * @param param.buildTarget
 * @returns
 */
export function buildProject({
  context,
  noBuild,
  buildTarget
}: {
  context: ExecutorContext;
  buildTarget?: string;
  noBuild?: boolean;
}): Observable<Target> {
  const targetString = buildTarget ? `${context.projectName}:${buildTarget}` : `${context.projectName}:build`;

  return defer(() => {
    // TODO: remove on Nx 17
    if (!context.projectGraph) {
      throw new Error('`context.projectGraph` does not exits');
    }

    const targetDescription = parseTargetString(targetString, context.projectGraph);

    if (noBuild) {
      console.log(noBuild);
      logger.info(`Skip ${context.projectName} building`);
      return of(targetDescription);
    }

    return _runBuildTarget({ context, targetString, targetDescription });
  });
}

/**
 * Run build target
 *
 * @param param.context
 * @param param.targetString
 * @param param.targetDescription
 * @returns
 * @private
 */
function _runBuildTarget({
  context,
  targetString,
  targetDescription
}: {
  context: ExecutorContext;
  targetString: string;
  targetDescription: Target;
}): Observable<Target> {
  if (!context.target) {
    throw new Error('Cannot execute the build target.');
  }

  return defer(async () => {
    logger.info(`Building project "${context.projectName}"`);
    logger.info(`Execute target "${targetString}"`);

    for await (const { success } of await runExecutor(targetDescription, {}, context)) {
      if (!success) {
        throw new Error(`Could not build "${targetDescription.project}".`);
      }
    }

    return targetDescription;
  });
}
