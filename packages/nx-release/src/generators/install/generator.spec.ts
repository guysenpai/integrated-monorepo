import { addProjectConfiguration, readJson, writeJson, type Tree } from '@nrwl/devkit';
import { createTreeWithEmptyWorkspace } from '@nrwl/devkit/testing';
// eslint-disable-next-line @nrwl/nx/enforce-module-boundaries
import inquirer from 'inquirer';

import install from './generator';

import type { InstallGeneratorSchema } from './schema';

jest.mock('inquirer');

const defaultOptions: InstallGeneratorSchema = {
  independent: false,
  enforceConventionalCommits: true,
  projects: []
};

describe('install generator', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
    addProjectConfiguration(tree, 'lib1', {
      root: 'libs/lib1',
      sourceRoot: 'libs/lib1/src',
      projectType: 'library',
      targets: {
        build: { executor: 'build' }
      }
    });
    writeJson(tree, 'libs/lib1/tsconfig.json', {
      files: [],
      include: [],
      references: []
    });

    addProjectConfiguration(tree, 'lib2', {
      root: 'libs/lib2',
      sourceRoot: 'libs/lib2/src',
      targets: {
        build: { executor: 'build', options: { main: 'index.ts' } }
      }
    });
    writeJson(tree, 'libs/lib2/tsconfig.json', {
      files: [],
      include: [],
      references: []
    });

    jest.spyOn(inquirer, 'prompt').mockResolvedValue({ projects: ['lib1'] });
  });

  afterEach(() => {
    (inquirer.prompt as jest.MockedFunction<typeof inquirer.prompt>).mockRestore();
  });

  describe('Synced versioning', () => {
    const options = { ...defaultOptions };

    it('should add a workspace project.json to the root of the workspace', async () => {
      await install(tree, options);

      const projectJSON = readJson(tree, 'project.json');

      expect(projectJSON).toBeDefined();
      expect(projectJSON.targets).toEqual(
        expect.objectContaining({
          version: {
            executor: '@guysenpai/nx-release:version',
            options: expect.objectContaining({})
          }
        })
      );
    });

    it('should add release target to workspace project.json with --createRelease', async () => {
      await install(tree, { ...options, createRelease: 'github' });

      const projectJSON = readJson(tree, 'project.json');

      expect(projectJSON).toBeDefined();
      expect(projectJSON.targets).toEqual(
        expect.objectContaining({
          release: {
            executor: '@guysenpai/nx-release:github',
            options: expect.objectContaining({})
          }
        })
      );
    });

    it('should add publish target to workspace project.json with --publish', async () => {
      await install(tree, { ...options, publish: true });

      const lib1 = readJson(tree, 'libs/lib1/project.json');
      const lib2 = readJson(tree, 'libs/lib2/project.json');

      expect(lib1.targets.version).toBeUndefined();
      expect(lib1.targets).toEqual(
        expect.objectContaining({
          publish: {
            executor: '@guysenpai/nx-release:npm',
            options: expect.objectContaining({})
          }
        })
      );
      expect(lib2.targets.version).toBeUndefined();
      expect(lib2.targets).toEqual(
        expect.objectContaining({
          publish: {
            executor: '@guysenpai/nx-release:npm',
            options: expect.objectContaining({})
          }
        })
      );
    });

    it('should not add publish target for non publishable project with --publish', async () => {
      addProjectConfiguration(tree, 'lib3', {
        root: 'libs/lib3',
        sourceRoot: 'libs/lib3/src',
        targets: {
          build: { executor: 'build' }
        }
      });
      writeJson(tree, 'libs/lib3/tsconfig.json', {
        files: [],
        include: [],
        references: []
      });

      await install(tree, { ...options, publish: true });

      const lib1 = readJson(tree, 'libs/lib1/project.json');
      const lib2 = readJson(tree, 'libs/lib2/project.json');
      const lib3 = readJson(tree, 'libs/lib3/project.json');

      expect(lib1.targets.version).toBeUndefined();
      expect(lib1.targets).toEqual(
        expect.objectContaining({
          publish: {
            executor: '@guysenpai/nx-release:npm',
            options: expect.objectContaining({})
          }
        })
      );
      expect(lib2.targets.version).toBeUndefined();
      expect(lib2.targets).toEqual(
        expect.objectContaining({
          publish: {
            executor: '@guysenpai/nx-release:npm',
            options: expect.objectContaining({})
          }
        })
      );
      expect(lib3.targets.version).toBeUndefined();
      expect(lib3.targets.publish).toBeUndefined();
    });
  });

  describe('Independent versioning', () => {
    const options = { ...defaultOptions, independent: true };

    it('should prompt user to select which projects should be versioned', async () => {
      await install(tree, options);

      const lib1 = readJson(tree, 'libs/lib1/project.json');
      const lib2 = readJson(tree, 'libs/lib2/project.json');

      expect(inquirer.prompt).toBeCalledWith(
        expect.objectContaining({
          name: 'projects',
          type: 'checkbox',
          choices: expect.arrayContaining([{ name: 'lib1', checked: true }])
        })
      );
      expect(lib1.targets).toEqual(
        expect.objectContaining({
          version: {
            executor: '@guysenpai/nx-release:version',
            options: expect.objectContaining({ independent: true })
          }
        })
      );
      expect(lib2.targets.version).toBeUndefined();
    });

    it('should use --projects option', async () => {
      await install(tree, { ...options, projects: ['lib2'] });

      const lib1 = readJson(tree, 'libs/lib1/project.json');
      const lib2 = readJson(tree, 'libs/lib2/project.json');

      expect(inquirer.prompt).not.toBeCalled();
      expect(lib1.targets.version).toBeUndefined();
      expect(lib2.targets).toEqual(
        expect.objectContaining({
          version: {
            executor: '@guysenpai/nx-release:version',
            options: expect.objectContaining({ independent: true })
          }
        })
      );
    });

    it('should forward --baseBranch option to all projects', async () => {
      jest.spyOn(inquirer, 'prompt').mockResolvedValue({ projects: ['lib1', 'lib2'] });

      await install(tree, { ...options, baseBranch: 'master' });

      const lib1 = readJson(tree, 'libs/lib1/project.json');
      const lib2 = readJson(tree, 'libs/lib2/project.json');

      expect(lib1.targets).toEqual(
        expect.objectContaining({
          version: {
            executor: '@guysenpai/nx-release:version',
            options: expect.objectContaining({ baseBranch: 'master' })
          }
        })
      );
      expect(lib2.targets).toEqual(
        expect.objectContaining({
          version: {
            executor: '@guysenpai/nx-release:version',
            options: expect.objectContaining({ baseBranch: 'master' })
          }
        })
      );
    });

    it('should add release target with --createRelease', async () => {
      await install(tree, { ...options, projects: ['lib1', 'lib2'], createRelease: 'gitlab' });

      const lib1 = readJson(tree, 'libs/lib1/project.json');
      const lib2 = readJson(tree, 'libs/lib2/project.json');

      expect(lib1.targets).toEqual(
        expect.objectContaining({
          release: {
            executor: '@guysenpai/nx-release:gitlab',
            options: expect.objectContaining({})
          }
        })
      );
      expect(lib2.targets).toEqual(
        expect.objectContaining({
          release: {
            executor: '@guysenpai/nx-release:gitlab',
            options: expect.objectContaining({})
          }
        })
      );
    });

    it('should add publish target with --publish', async () => {
      await install(tree, { ...options, projects: ['lib1', 'lib2'], publish: true });

      const lib1 = readJson(tree, 'libs/lib1/project.json');
      const lib2 = readJson(tree, 'libs/lib2/project.json');

      expect(lib1.targets).toEqual(
        expect.objectContaining({
          publish: {
            executor: '@guysenpai/nx-release:npm',
            options: expect.objectContaining({})
          }
        })
      );
      expect(lib2.targets).toEqual(
        expect.objectContaining({
          publish: {
            executor: '@guysenpai/nx-release:npm',
            options: expect.objectContaining({})
          }
        })
      );
    });

    it('should not add publish target for non publishable project with --publish', async () => {
      addProjectConfiguration(tree, 'lib3', {
        root: 'libs/lib3',
        sourceRoot: 'libs/lib3/src',
        targets: {
          build: { executor: 'build' }
        }
      });
      writeJson(tree, 'libs/lib3/tsconfig.json', {
        files: [],
        include: [],
        references: []
      });

      await install(tree, { ...options, projects: ['lib1', 'lib3'], publish: true });

      const lib1 = readJson(tree, 'libs/lib1/project.json');
      const lib3 = readJson(tree, 'libs/lib3/project.json');

      expect(lib1.targets).toEqual(
        expect.objectContaining({
          publish: {
            executor: '@guysenpai/nx-release:npm',
            options: expect.objectContaining({})
          }
        })
      );
      expect(lib3.targets.publish).toBeUndefined();
    });

    it('should not a create root project.json', async () => {
      await install(tree, options);

      let projectJSON;

      try {
        projectJSON = readJson(tree, 'project.json');
      } catch (error) {
        expect(error.message).toEqual('Cannot find project.json');
      }

      expect(projectJSON).toBeUndefined();
    });

    describe('--changelog-preset option', () => {
      it('should install conventional config', async () => {
        await install(tree, { ...options, changelogPreset: 'conventionalcommits' });

        const packageJson = readJson(tree, 'package.json');
        const lib1 = readJson(tree, 'libs/lib1/project.json');

        expect(packageJson.devDependencies).toContainKeys(['@commitlint/cli', '@commitlint/config-conventional']);
        expect(lib1.targets).toEqual(
          expect.objectContaining({
            version: {
              executor: '@guysenpai/nx-release:version',
              options: expect.objectContaining({ changelogPreset: 'conventionalcommits' })
            }
          })
        );
      });

      it('should install angular config', async () => {
        await install(tree, { ...options, changelogPreset: 'angular' });

        const packageJson = readJson(tree, 'package.json');
        const lib1 = readJson(tree, 'libs/lib1/project.json');

        expect(packageJson.devDependencies).toContainKeys(['@commitlint/cli', '@commitlint/config-angular']);
        expect(lib1.targets).toEqual(
          expect.objectContaining({
            version: {
              executor: '@guysenpai/nx-release:version',
              options: expect.objectContaining({ changelogPreset: 'angular' })
            }
          })
        );
      });

      it('should extends conventional commitlint config', async () => {
        await install(tree, { ...options, changelogPreset: 'conventionalcommits' });

        const commitlintConfig = readJson(tree, '.commitlintrc');

        expect(commitlintConfig.extends).toEqual(['@commitlint/config-conventional']);
      });

      it('should extends angular commitlint config', async () => {
        await install(tree, { ...options, changelogPreset: 'angular' });

        const commitlintConfig = readJson(tree, '.commitlintrc');

        expect(commitlintConfig.extends).toEqual(['@commitlint/config-angular']);
      });
    });
  });

  describe('Enforce Conventional Commints', () => {
    const options: InstallGeneratorSchema = {
      ...defaultOptions,
      enforceConventionalCommits: true,
      changelogPreset: 'angular'
    };

    it('should add commitlint to package.json devDependencies', async () => {
      await install(tree, options);

      const packageJson = readJson(tree, 'package.json');

      expect(packageJson.devDependencies).toContainKeys(['@commitlint/cli', '@commitlint/config-angular']);
    });

    it('should add commitlint config if does not exist', async () => {
      await install(tree, options);

      const commitlintConfig = readJson(tree, '.commitlintrc');

      expect(commitlintConfig.extends).toEqual(['@commitlint/config-angular']);
    });

    it('should not add commitlint config to package.json if exists', async () => {
      const packageJson = readJson(tree, 'package.json');

      packageJson.commitlint = { extends: ['other'] };
      tree.write('package.json', JSON.stringify(packageJson, null, 2));

      await install(tree, options);

      const commitlintConfig = readJson(tree, 'package.json').commitlint;

      expect(commitlintConfig.extends).toEqual(['other']);
    });

    it('should add husky to package.json devDependencies', async () => {
      await install(tree, options);

      const packageJson = readJson(tree, 'package.json');

      expect(packageJson.devDependencies).toContainKey('husky');
    });

    it('should add husky config if does not exist', async () => {
      await install(tree, options);

      const packageJson = readJson(tree, 'package.json');

      expect(tree.exists('.husky/commit-msg')).toEqual(true);
      expect(packageJson.scripts.prepare).toEqual('husky install');
    });

    it('should not add husky config if exists', async () => {
      tree.write('.husky/_/husky.sh', '');
      tree.write('.husky/commit-msg', 'test');

      await install(tree, options);

      const packageJson = readJson(tree, 'package.json');

      expect(tree.read('.husky/commit-msg').toString()).toEqual('test');
      expect(packageJson.scripts?.prepare).toBeUndefined();
    });

    it('should do nothing if no enforceConventionalCommits', async () => {
      await install(tree, { ...options, enforceConventionalCommits: false });

      const packageJson = readJson(tree, 'package.json');

      expect(packageJson.devDependencies).not.toContainKeys(['@commitlint/cli', '@comitlint/config-angular']);
    });
  });
});
