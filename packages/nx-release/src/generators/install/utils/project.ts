import { getProjects, type ProjectConfiguration, type Tree } from '@nrwl/devkit';

/**
 * Get buildable projects
 *
 * @param tree
 * @returns
 */
export function getPublishableProjects(tree: Tree): Map<string, ProjectConfiguration> {
  const projects = getProjects(tree);

  // Remove all non publishable projects
  Array.from(projects.entries()).forEach(([key, project]) => {
    if (!isPublishable(project)) {
      projects.delete(key);
    }
  });

  return projects;
}

/**
 * Check if the project is publishable
 *
 * @param project
 * @returns
 */
export function isPublishable(project: ProjectConfiguration): boolean {
  return _isPublishableLibrary(project) || _isPublishableNonLibrary(project);
}

/**
 * Check if the project is buildable
 *
 * @param project
 * @returns
 * @private
 */
function _isBuildable(project: ProjectConfiguration): boolean {
  return typeof project.targets?.build === 'object';
}

/**
 * Check if the project is a buildable library
 *
 * @param project
 * @returns
 * @private
 */
function _isPublishableLibrary(project: ProjectConfiguration): boolean {
  return _isBuildable(project) && project.projectType === 'library';
}

/**
 * Check if the project is a buildable non library
 *
 * @param project
 * @returns
 * @private
 */
function _isPublishableNonLibrary(project: ProjectConfiguration): boolean {
  return (
    _isBuildable(project) &&
    project.projectType === undefined &&
    typeof project.targets?.build?.options?.main === 'string'
  );
}
