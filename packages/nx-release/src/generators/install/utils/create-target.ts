import type { TargetConfiguration } from '@nrwl/devkit';
import type { InstallGeneratorSchema } from '../schema';

/**
 * Create nx-release version target
 *
 * @param options
 * @returns
 */
export function createVersionTarget(options: InstallGeneratorSchema): TargetConfiguration {
  const targetOptions = _createTargetOptions(options);

  return {
    executor: '@guysenpai/nx-release:version',
    ...(Object.keys(targetOptions).length > 0 ? { options: targetOptions } : {})
  };
}

/**
 * Create nx-release release target
 *
 * @param options
 * @returns
 */
export function createReleaseTarget(options: InstallGeneratorSchema): TargetConfiguration {
  return {
    executor: `@guysenpai/nx-release:${options.createRelease}`,
    options: {
      tag: '${tag}',
      notes: '${notes}'
    }
  };
}

/**
 * Create nx-release publish target
 *
 * @returns
 */
export function createPublishTarget(production?: boolean): TargetConfiguration {
  return {
    executor: '@guysenpai/nx-release:npm',
    options: {
      access: 'public',
      targetBuild: production ? 'build:production' : 'build',
      dryRun: '${dryRun}'
    }
  };
}

/**
 * Create nx-release target options
 *
 * @param options
 * @private
 */
function _createTargetOptions(options: InstallGeneratorSchema): TargetConfiguration['options'] {
  const targetOptions = ['syncVersions', 'baseBranch', 'changelogPreset', 'commitMessageFormat'];

  return targetOptions
    .filter(key => Boolean(options[key]))
    .reduce(
      (targetOptions, key) => ({
        ...targetOptions,
        [key]: options[key as keyof InstallGeneratorSchema]
      }),
      {}
    );
}
