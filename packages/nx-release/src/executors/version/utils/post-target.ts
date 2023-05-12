import { Target, parseTargetString, readTargetOptions, runExecutor, type ExecutorContext } from '@nrwl/devkit';
import { catchError, concat, defer, type Observable } from 'rxjs';

import { eventLog } from './logger';
import { coerce, createTemplateString } from './template-string';

export function runPostTargets({
  postTargets,
  templateStringContext,
  context,
  projectName
}: {
  postTargets: string[];
  templateStringContext: Record<string, unknown>;
  context: ExecutorContext;
  projectName: string;
}): Observable<void> {
  return concat(
    ...postTargets.map(postTargetSchema =>
      defer(async () => {
        const targetDescription = parseTargetString(postTargetSchema, context.projectGraph);

        _checkTargetExist(targetDescription, context);

        const targetOptions = _getTargetOptions({
          options: readTargetOptions(targetDescription, context),
          context: templateStringContext
        });

        for await (const { success } of await runExecutor(targetDescription, targetOptions, context)) {
          if (!success) {
            throw new Error(
              `Something went wrong with target "${targetDescription.project}:${targetDescription.target}".`
            );
          }
        }
      }).pipe(
        eventLog({
          event: 'post_target_success',
          message: `Ran target "${postTargetSchema}"`,
          projectName
        }),
        catchError(error => {
          if (error?.name === 'SchemaError') {
            throw new Error(error.message);
          }

          throw error;
        })
      )
    )
  );
}

/**
 * Get target options
 *
 * @param param0
 * @returns
 * @private
 */
function _getTargetOptions({
  options = {},
  context
}: {
  options?: Record<string, unknown>;
  context: Record<string, unknown>;
}): Record<string, unknown> {
  return Object.entries(options).reduce((optionsAccumulator, [option, value]) => {
    console.log(value);
    const resolvedValue = Array.isArray(value)
      ? value.map(_element =>
          typeof _element !== 'object'
            ? coerce(createTemplateString(_element.toString(), context))
            : _getTargetOptions({ options: _element, context })
        )
      : typeof value === 'object'
      ? _getTargetOptions({ options: value as Record<string, unknown>, context })
      : coerce(createTemplateString(value.toString(), context));

    return {
      ...optionsAccumulator,
      [option]: resolvedValue
    };
  }, {});
}

/**
 * Check if given target exists, otherwise throw an error
 *
 * @param target
 * @param context
 * @private
 */
function _checkTargetExist(targetDescription: Target, context: ExecutorContext): void {
  const project = context.projectsConfigurations?.projects?.[targetDescription.project];

  if (project === undefined) {
    throw new Error(
      `The target project "${
        targetDescription.project
      }" does not exist in your workspace. Available projects: ${Object.keys(
        context.projectsConfigurations?.projects ?? []
      ).map(project => `"${project}"`)}`
    );
  }

  const projectTarget = project?.targets?.[targetDescription.target];

  if (projectTarget === undefined) {
    throw new Error(
      `The target name "${targetDescription.target}" does not exist. Available targets for "${
        targetDescription.project
      }": ${Object.keys(project.targets || {}).map(target => `"${target}"`)}.`
    );
  }
}
