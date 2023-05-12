import { mkdirSync, writeFileSync } from 'fs';
import { dirname, resolve } from 'path';
import rimraf from 'rimraf';
import tmp from 'tmp';
import { promisify } from 'util';

import type { ExecutorContext, ProjectGraph, ProjectsConfigurations, TargetConfiguration } from '@nrwl/devkit';

export interface TestingWorkspace {
  tearDown(): Promise<void>;
  root: string;
}

export interface AdditionalProject {
  project: string;
  projectRoot: string;
  targets?: Record<string, TargetConfiguration>;
}

/**
 * Setup testing workspace
 *
 * @param files
 * @returns
 */
export function setupTestingWorkspace(files: Map<string, string>): TestingWorkspace {
  // Create a temporary directory
  const tmpDir = tmp.dirSync();

  for (const [fileRelativePath, content] of files.entries()) {
    const filePath = resolve(tmpDir.name, fileRelativePath);
    const directory = dirname(filePath);

    // Create path
    mkdirSync(directory, { recursive: true });

    // Create file
    writeFileSync(filePath, content, 'utf-8');
  }

  const originalCwd = process.cwd();
  process.chdir(tmpDir.name);

  const workspaceRoot = process.cwd();

  return {
    /**
     * Destroy and restore cwd
     */
    async tearDown() {
      await promisify(rimraf)(workspaceRoot);
      process.chdir(originalCwd);
    },
    root: workspaceRoot
  };
}

/**
 * Create testing context
 *
 * @param param.cwd
 * @param param.project
 * @param param.projectRoot
 * @param param.workspaceRoot
 * @param param.additionalProjects
 * @returns
 */
export function createTestingContext({
  cwd = process.cwd(),
  project,
  projectRoot,
  workspaceRoot,
  projectGraph,
  additionalProjects = []
}: {
  cwd?: string;
  project: string;
  projectRoot: string;
  workspaceRoot: string;
  projectGraph?: ProjectGraph;
  additionalProjects?: AdditionalProject[];
}): ExecutorContext {
  return {
    isVerbose: false,
    cwd,
    root: workspaceRoot,
    projectGraph,
    projectName: project,
    projectsConfigurations: {
      version: 2,
      projects: {
        [project]: {
          root: projectRoot,
          targets: {}
        },
        ..._assembleAdditionalProjects(additionalProjects)
      }
    }
  } satisfies ExecutorContext;
}

/**
 * Assemble additional projects
 *
 * @param additionalProjects
 * @returns
 * @private
 */
function _assembleAdditionalProjects(additionalProjects: AdditionalProject[]): ProjectsConfigurations['projects'] {
  return additionalProjects.reduce<ProjectsConfigurations['projects']>((acc, p) => {
    acc[p.project] = {
      root: p.projectRoot,
      targets: p.targets || {}
    };

    return acc;
  }, {} satisfies ProjectsConfigurations['projects']);
}
