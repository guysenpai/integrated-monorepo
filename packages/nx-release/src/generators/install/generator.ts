import { addProjectConfiguration, formatFiles, installPackagesTask, type Tree } from '@nrwl/devkit';

import { setupWorkspacePublishTarget } from './utils/setup-publish';
import { addDependencies } from './utils/add-dependencies';
import { createReleaseTarget, createVersionTarget } from './utils/create-target';
import { updateWorkspaceFromPrompt, updateWorkspaceFromSchema } from './utils/workspace';

import type { InstallGeneratorSchema } from './schema';
import { updatePostTargets } from './utils/update-post-targets';

export default async function install(tree: Tree, options: InstallGeneratorSchema): Promise<() => void> {
  // Independant versioning
  if (options.independent) {
    options.projects && options.projects.length > 0
      ? updateWorkspaceFromSchema(tree, options)
      : await updateWorkspaceFromPrompt(tree, options);
  }
  // Synced versioning
  else {
    addProjectConfiguration(tree, 'workspace', {
      root: '.',
      targets: {
        version: createVersionTarget(options),
        ...(options.createRelease ? { release: createReleaseTarget(options) } : {})
      }
    });

    if (options.createRelease) {
      updatePostTargets(tree, 'workspace', `workspace:release`);
    }

    if (options.publish) {
      setupWorkspacePublishTarget(tree);
    }
  }

  addDependencies(tree, options);
  await formatFiles(tree);

  return () => {
    !options.skipInstall && installPackagesTask(tree);
  };
}
