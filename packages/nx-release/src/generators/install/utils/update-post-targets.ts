import { readProjectConfiguration, updateProjectConfiguration, type Tree } from '@nrwl/devkit';

/**
 * Update version target's postTargets option
 *
 * @param tree
 * @param projectName
 */
export function updatePostTargets(tree: Tree, projectName: string, target: string): void {
  const project = readProjectConfiguration(tree, projectName);
  const targetOptions = project.targets.version.options ?? {};
  const postTargets: string[] = targetOptions.postTargets ?? [];

  postTargets.push(target);
  targetOptions.postTargets = [...new Set([...postTargets])];
  project.targets.version.options = targetOptions;

  updateProjectConfiguration(tree, projectName, project);
}
