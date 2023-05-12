import { joinPathFragments, readTargetOptions, type ExecutorContext, type Target } from '@nrwl/devkit';
import { promises } from 'fs';
import { dirname } from 'path';
import { catchError, defer, of, switchMap, type Observable } from 'rxjs';

import type { BuildOptions } from '../schema';

interface NgPackageJson {
  dest?: string;
}

/**
 * Returns dist path
 *
 * @param param.targetDescription
 * @param param.distFolderPath
 * @param param.context
 * @returns
 */
export function getDistPath({
  targetDescription,
  distFolderPath,
  context
}: {
  targetDescription: Target;
  distFolderPath?: string;
  context: ExecutorContext;
}): Observable<string> {
  return defer(() => {
    const projectRoot = context.root;
    const { outputPath, project } = readTargetOptions<BuildOptions>(targetDescription, context);

    return _getOutputPath({ projectRoot, distFolderPath, outputPath, project });
  }).pipe(
    catchError(error => {
      if (/Failed to read|option does not exist/.test(error)) {
        throw error;
      }

      throw new Error("Cannot find the library's dist path");
    })
  );
}

function _getOutputPath({
  projectRoot,
  distFolderPath,
  outputPath,
  project
}: {
  projectRoot: string;
  distFolderPath?: string;
  outputPath?: string;
  project?: string;
}): Observable<string> {
  return defer(() => {
    if (distFolderPath) {
      return of(joinPathFragments(projectRoot, distFolderPath));
    }

    if (outputPath) {
      return of(joinPathFragments(projectRoot, outputPath));
    }

    if (project) {
      const ngPackageJsonPath = joinPathFragments(projectRoot, project);

      return defer(async () => await promises.readFile(ngPackageJsonPath, { encoding: 'utf-8' })).pipe(
        catchError(() => {
          throw new Error('Failed to read the ng-package.json');
        }),
        switchMap(ngPackageJsonContent => {
          const ngPackageJson: NgPackageJson = JSON.parse(ngPackageJsonContent);

          if (!ngPackageJson.dest || typeof ngPackageJson.dest !== 'string') {
            throw new Error("`dest` option does not exist or it's not a string");
          }

          return of(joinPathFragments(dirname(ngPackageJsonPath), ngPackageJson.dest));
        })
      );
    }

    throw new Error(
      'Cannot detect the dist path.\nUse the option --dist-folder-path to indicate where is the dist folder of your library.'
    );
  });
}
