import { logger, updateProjectConfiguration, type Tree } from '@nrwl/devkit';

import { createPublishTarget } from './create-target';
import { getPublishableProjects } from './project';
import { updatePostTargets } from './update-post-targets';

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
      updatePostTargets(tree, 'workspace', `${projectName}:publish`);
    }
  });
}
