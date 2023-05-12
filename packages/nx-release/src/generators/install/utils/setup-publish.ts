import { logger, readProjectConfiguration, updateProjectConfiguration, type Tree } from '@nrwl/devkit';

import { createPublishTarget } from './create-target';
import { getPublishableProjects } from './project';

/**
 * Setup publish target for synced mode
 *
 * @param tree
 */
export function setupWorkspacePublishTarget(tree: Tree): void {
  // Get buildable projects
  const projects = getPublishableProjects(tree);

  // log if there is no projects to install
  if (projects.size === 0) {
    logger.info('There are no publishable project in this workspace.');
  }

  Array.from(projects.entries()).forEach(([projectName, project]) => {
    if (project.targets) {
      const production = Boolean(project.targets.build?.configurations?.production);
      project.targets.publish = createPublishTarget(production);

      updateProjectConfiguration(tree, projectName, project);

      // Add target to workspace version postTargets
      const workspace = readProjectConfiguration(tree, 'workspace');
      const targetOptions = workspace.targets.version.options ?? {};
      const postTargets: string[] = targetOptions.postTargets ?? [];
      postTargets.push(`${projectName}:publish`);
      updateProjectConfiguration(tree, 'workspace', workspace);
    }
  });
}
