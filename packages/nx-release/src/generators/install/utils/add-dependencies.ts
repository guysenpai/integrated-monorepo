import {
  addDependenciesToPackageJson,
  getPackageManagerCommand,
  getWorkspaceLayout,
  readJson,
  updateJson,
  type Tree
} from '@nrwl/devkit';
import { constants } from 'fs';

import { listProjects } from './workspace';
import { commitlintConfigVersion, commitlintVersion, huskyVersion, lintStagedVersion } from './versions';

import type { InstallGeneratorSchema } from '../schema';

const PACKAGE_JSON = 'package.json';

interface PackageJson {
  scripts: Record<string, string>;
  devDependencies: Record<string, string>;
  commitlint: Record<string, string[]>;
  'lint-staged': Record<string, string | string[]>;
}

/**
 * Add dependencies and/or dev dependencies to package.json
 *
 * @param tree
 * @param options
 */
export function addDependencies(tree: Tree, options: InstallGeneratorSchema): void {
  if (options.enforceConventionalCommits) {
    _addCommitlintConfig(tree, options);
    _addLintStagedConfig(tree);
    _addHuskyConfig(tree);
    _addHuskyConfigGitHooks(tree);
    _addDevDependencies(tree, options);
  }
}

/**
 * Add commitlint config to workspace
 *
 * @param tree
 * @param options
 * @private
 */
function _addCommitlintConfig(tree: Tree, options: InstallGeneratorSchema): void {
  const packageJson: PackageJson = readJson(tree, PACKAGE_JSON);
  const hasConfig =
    packageJson.commitlint != null ||
    tree.exists('.commitlintrc') ||
    tree.exists('.commitlintrc.json') ||
    tree.exists('.commitlintrc.yaml') ||
    tree.exists('.commitlintrc.yml') ||
    tree.exists('.commitlintrc.js') ||
    tree.exists('.commitlintrc.cjs') ||
    tree.exists('.commitlintrc.ts') ||
    tree.exists('.commitlintrc.cts') ||
    tree.exists('commitlint.config.js') ||
    tree.exists('commitlint.config.cjs') ||
    tree.exists('commitlint.config.ts') ||
    tree.exists('commitlint.config.cjs');

  if (!hasConfig) {
    const packages = listProjects(tree).map(({ projectName }) => projectName);

    tree.write(
      '.commitlintrc',
      JSON.stringify(
        {
          extends: [_getCommitlintConfig(options)],
          rules: {
            'scope-enum': [2, 'always', packages]
          }
        },
        null,
        2
      )
    );
  }
}

/**
 * Get commitlint config
 *
 * @param options
 * @returns
 * @private
 */
function _getCommitlintConfig(options: InstallGeneratorSchema): string {
  return options.changelogPreset === 'angular' ? '@commitlint/config-angular' : '@commitlint/config-conventional';
}

/**
 * Add lint-staged config
 *
 * @param tree
 */
function _addLintStagedConfig(tree: Tree): void {
  const packageJson: PackageJson = readJson(tree, PACKAGE_JSON);
  const hasConfig =
    packageJson['lint-staged'] != null ||
    tree.exists('.lintstagedrc') ||
    tree.exists('.lintstagedrc.json') ||
    tree.exists('.lintstagedrc.yaml') ||
    tree.exists('.lintstagedrc.yml') ||
    tree.exists('.lintstagedrc.js') ||
    tree.exists('.lintstagedrc.cjs') ||
    tree.exists('.lintstagedrc.mjs') ||
    tree.exists('lint-staged.config.js') ||
    tree.exists('lint-staged.config.cjs') ||
    tree.exists('lint-staged.config.mjs');

  if (!hasConfig) {
    const pmc = getPackageManagerCommand();
    const dirs = _getLintStagedConfigDirectories(tree);

    tree.write(
      '.lintstagedrc',
      JSON.stringify(
        {
          [`{${dirs},tools}/**/*.{ts,js,json,html,scss,css}`]: [
            `${pmc.exec} nx affected --target=lint --uncommitted --parallel=3 --fix=true`,
            `${pmc.exec} nx affected --target=test --uncommitted --parallel=3`,
            `${pmc.exec} nx format:write --uncommitted --libs-and-apps`
          ]
        },
        null,
        2
      )
    );
  }
}

/**
 * Get workspace layout dirs
 *
 * @param tree
 * @returns
 */
function _getLintStagedConfigDirectories(tree: Tree): string {
  const workspaceLayout = getWorkspaceLayout(tree);

  return [
    ...new Set(
      Object.entries(workspaceLayout).map(([key, value]) => [['appsDir', 'libsDir'].includes(key) ? value : [].join()])
    )
  ].join(',');
}

/**
 * Add Husky config to workspace
 *
 * @param tree
 * @returns
 * @private
 */
function _addHuskyConfig(tree: Tree): void {
  return updateJson(tree, PACKAGE_JSON, (packageJson: PackageJson) => {
    const hasHusky = tree.exists('.husky/_/husky.sh');

    if (!hasHusky) {
      packageJson.scripts = {
        ...packageJson.scripts,
        ...{ prepare: 'husky install' }
      };
    }

    return packageJson;
  });
}

/**
 * Add Husky config for git hooks
 *
 * @param tree
 * @private
 */
function _addHuskyConfigGitHooks(tree: Tree): void {
  const hasPreCommitHook = tree.exists('.husky/pre-commit');

  if (!hasPreCommitHook) {
    const preCommit = `#!/usr/bin/env sh\n. "$(dirname -- "$0")/_/husky.sh"\n\n${
      getPackageManagerCommand().exec
    } lint-staged\n`;

    tree.write('.husky/pre-commit', preCommit, {
      mode: constants.S_IRWXU
    });
  }

  const hasCommitMsgHook = tree.exists('.husky/commit-msg');

  if (!hasCommitMsgHook) {
    const commitMsg = `#!/usr/bin/env sh\n. "$(dirname -- "$0")/_/husky.sh"\n\n[ -n "$CI" ] && exit 0\n${
      getPackageManagerCommand().exec
    } commitlint --edit "$1"\n`;

    tree.write('.husky/commit-msg', commitMsg, {
      mode: constants.S_IRWXU
    });
  }
}

/**
 * Add dev dependencies to package.json
 *
 * @param tree
 * @param options
 * @private
 */
function _addDevDependencies(tree: Tree, options: InstallGeneratorSchema): void {
  if (!options.skipInstall) {
    addDependenciesToPackageJson(
      tree,
      {},
      {
        '@commitlint/cli': commitlintVersion,
        [_getCommitlintConfig(options)]: commitlintConfigVersion,
        husky: huskyVersion,
        'lint-staged': lintStagedVersion
      }
    );
  }
}
