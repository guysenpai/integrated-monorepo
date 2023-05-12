import type { ExecutorContext, ProjectConfiguration, ProjectsConfigurations } from '@nrwl/devkit';
import { resolve } from 'path';

/**
 * Get project configuration from executor context
 *
 * @param context
 * @returns
 */
export function getProject(context: ExecutorContext): ProjectConfiguration {
  const project = context.projectsConfigurations?.projects[context.projectName];

  if (!project) {
    throw new Error(`Project root not found for ${context.projectName}`);
  }

  return project;
}

/**
 * Get project root
 *
 * @param workspaceRoot
 * @param workspace
 * @returns
 */
export function getProjectRoots(workspaceRoot: string, workspace?: ProjectsConfigurations): string[] {
  const projects = Object.values(workspace?.projects ?? {});

  if (projects.length === 0) {
    throw new Error('No projects found in workspace');
  }

  return projects.map(project =>
    typeof project === 'string' ? resolve(workspaceRoot, project) : resolve(workspaceRoot, project.root)
  );
}
