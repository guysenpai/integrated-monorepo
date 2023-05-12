import { ProjectConfiguration, getProjects, updateProjectConfiguration, type Tree } from '@nrwl/devkit';

import { createPrompt } from './create-prompt';
import { createReleaseTarget, createVersionTarget } from './create-target';

import type { InstallGeneratorSchema } from '../schema';
import { createPublishTarget } from './create-target';
import { isPublishable } from './project';
import { updatePostTargets } from './update-post-targets';

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
      updateProjectConfiguration(tree, projectName, {
        ...project,
        targets: {
          ...(project.targets ?? {}),
          version: createVersionTarget(options),
          ...(options.createRelease ? { release: createReleaseTarget(options) } : {}),
          ...(options.publish && isPublishable(project) ? { publish: createPublishTarget() } : {})
        }
      });

      // Add `release` target to version's postTarget option
      if (options.createRelease) {
        updatePostTargets(tree, projectName, `${projectName}:release`);
      }

      // Add `publish` target to version's postTarget option for publishable projects
      if (options.publish && isPublishable(project)) {
        updatePostTargets(tree, projectName, `${projectName}:publish`);
      }
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
