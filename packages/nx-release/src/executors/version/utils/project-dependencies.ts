import type { ExecutorContext } from '@nrwl/devkit';
import type { VersionExecutorSchema } from '../schema';

export interface DependencyRoot {
  name: string;
  path: string;
}

/**
 * Get in-repo dependencies base on Nx's dependency graph with it's project root
 *
 * @param param.trackDeps
 * @param param.releaseType
 * @param param.projectName
 * @param param.context
 * @returns
 */
export async function getDependencyRoots({
  trackDeps,
  releaseType,
  projectName,
  context,
  skipProject
}: Required<Pick<VersionExecutorSchema, 'trackDeps'>> &
  Pick<VersionExecutorSchema, 'releaseType'> & {
    skipProject: boolean;
    projectName: string;
    context: ExecutorContext;
  }): Promise<DependencyRoot[]> {
  if (trackDeps && !releaseType && !skipProject) {
    // Include any depended-upon libraries in determining the version bump
    return getProjectDependencies(projectName, context).map(name => ({
      name,
      path: context.projectsConfigurations?.projects[name].root
    }));
  }
  return [];
}

/**
 * Get the list of in-repo dependencies based on Nx's dependency graph
 *
 * @param projectName
 * @returns
 */
export function getProjectDependencies(projectName: string, context: ExecutorContext): string[] {
  // TODO: remove on Nx 17
  if (!context.projectGraph) {
    throw new Error('`context.projectGraph` does not exist');
  }

  const dependencies = context.projectGraph.dependencies[projectName];

  return dependencies.filter(dependency => !dependency.target.startsWith('npm:')).map(dependency => dependency.target);
}
