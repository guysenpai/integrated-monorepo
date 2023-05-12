import { ProjectConfiguration, getProjects, updateProjectConfiguration, type Tree } from '@nrwl/devkit';

import { createPrompt } from './create-prompt';
import { createReleaseTarget, createVersionTarget } from './create-target';

import type { InstallGeneratorSchema } from '../schema';
import { createPublishTarget } from './create-target';
import { isPublishable } from './project';

export type ProjectDefinition = ProjectConfiguration & { projectName: string };

/**
 * List all the projects in the workspace
 *
 * @param tree
 * @returns
 */
export function listProjects(tree: Tree): ProjectDefinition[] {
  const projects = getProjects(tree);

  return Array.from(projects.entries()).map(([projectName, project]) => ({
    projectName,
    ...project
  }));
}

/**
 * Update projects
 *
 * @param tree
 * @param options
 * @param predicate
 */
export function updateProjects(
  tree: Tree,
  options: InstallGeneratorSchema,
  predicate: (projectName: string) => boolean
): void {
  getProjects(tree).forEach((project, projectName) => {
    if (predicate(projectName)) {
      const targets = project.targets ?? {};
      targets.version = createVersionTarget(options);

      // Setup `release` target
      if (options.createRelease) {
        targets.release = createReleaseTarget(options);

        // Add project `release` target to version postTargets options
        targets.version = _updateVersionPostTargets(targets, `${projectName}:release`);
      }

      // Setup `publish` target for publishable projects
      if (options.publish && isPublishable(project)) {
        targets.publish = createPublishTarget();

        // Add project `publish` target to version postTargets options
        targets.version = _updateVersionPostTargets(targets, `${projectName}:publish`);
      }

      updateProjectConfiguration(tree, projectName, project);
    }
  });
}

/**
 * Update workspace projects from schema
 * @param tree
 * @param options
 * @returns
 */
export function updateWorkspaceFromSchema(tree: Tree, options: InstallGeneratorSchema): void {
  return updateProjects(tree, options, projectName => options.projects?.includes(projectName));
}

/**
 * Update workspace project from prompt answers
 *
 * @param tree
 * @param options
 * @returns
 */
export async function updateWorkspaceFromPrompt(tree: Tree, options: InstallGeneratorSchema): Promise<void> {
  const projects = listProjects(tree);
  const answers = await createPrompt(projects);

  return updateProjects(tree, options, projectName => answers.projects.includes(projectName));
}

/**
 * Add target string to post targets
 *
 * @param targets
 * @param targetString
 * @returns
 * @private
 */
function _updateVersionPostTargets(targets: ProjectConfiguration['targets'], targetString: string) {
  // return {
  //   ...(targets.version ?? {}),
  //   options: {
  //     ...(targets.version.options ?? {}),
  //     postTargets: [...(targets.version.options?.postTargets ?? []), targetString]
  //   }
  // };
  const targetOptions = targets.version.options ?? {};
  const postTargets: string[] = targetOptions.postTargets ?? [];
  postTargets.push(targetString);

  return targets.version;
}
