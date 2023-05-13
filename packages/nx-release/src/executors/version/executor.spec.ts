import { logger, type ExecutorContext } from '@nrwl/devkit';
import { of, throwError } from 'rxjs';

import { createTestingContext } from '../utils/testing';
import version from './executor';
import {
  calculateChangelogChanges,
  defaultHeader,
  getChangelogPath,
  insertChangelogDependencyUpdates,
  updateChangelog
} from './utils/changelog';
import { commit } from './utils/commit';
import { addToStage, createTag, getLastCommitHash, tryPush } from './utils/git';
import { runPostTargets } from './utils/post-target';
import { getPackageJsonPath, shouldSkipPrivateProject, updatePackageJson } from './utils/project';
import { getDependencyRoots } from './utils/project-dependencies';
import { tryBump } from './utils/try-bump';
import * as workspace from './utils/workspace';

import type { VersionExecutorSchema } from './schema';

const LAST_COMMIT_HASH = 'lastCommitHash';

jest.mock('@nrwl/devkit', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    log: jest.fn()
  }
}));
jest.mock('./utils/changelog');
jest.mock('./utils/project');
jest.mock('./utils/commit', () => ({
  commit: jest.fn(),
  formatCommitMessage: jest.requireActual('./utils/commit').formatCommitMessage
}));
jest.mock('./utils/git');
jest.mock('./utils/project-dependencies');
jest.mock('./utils/try-bump');
jest.mock('./utils/post-target');

describe('version executor', () => {
  const mockShouldSkipPrivateProject = shouldSkipPrivateProject as jest.MockedFunction<typeof shouldSkipPrivateProject>;
  const mockUpdatePackageJson = updatePackageJson as jest.MockedFunction<typeof updatePackageJson>;
  const mockUpdateChangelog = updateChangelog as jest.MockedFunction<typeof updateChangelog>;
  const mockInsertChangelogDependencyUpdates = insertChangelogDependencyUpdates as jest.MockedFunction<
    typeof insertChangelogDependencyUpdates
  >;
  const mockCalculateChangelogChanges = calculateChangelogChanges as jest.MockedFunction<
    typeof calculateChangelogChanges
  >;
  const mockTryPush = tryPush as jest.MockedFunction<typeof tryPush>;
  const mockGetLastCommitHash = getLastCommitHash as jest.MockedFunction<typeof getLastCommitHash>;
  const mockAddToStage = addToStage as jest.MockedFunction<typeof addToStage>;
  const mockCommit = commit as jest.MockedFunction<typeof commit>;
  const mockCreateTag = createTag as jest.MockedFunction<typeof createTag>;
  const mockTryBump = tryBump as jest.MockedFunction<typeof tryBump>;
  const mockGetDependencyRoots = getDependencyRoots as jest.MockedFunction<typeof getDependencyRoots>;
  const mockRunPostTargets = runPostTargets as jest.MockedFunction<typeof runPostTargets>;

  let context: ExecutorContext;

  const options: VersionExecutorSchema = {
    dryRun: false,
    trackDeps: false,
    noVerify: false,
    push: false,
    remote: 'origin',
    baseBranch: 'main',
    syncVersions: false,
    skipRootChangelog: false,
    skipProjectChangelog: false,
    skipPrivate: false,
    skipCommit: false,
    skipTag: false,
    amend: false,
    postTargets: [],
    changelogPreset: 'angular',
    commitMessageFormat: 'chore(${projectName}): release version ${version}'
  };

  beforeEach(() => {
    context = createTestingContext({
      project: 'a',
      projectRoot: '/root/packages/a',
      workspaceRoot: '/root',
      projectGraph: { nodes: {}, dependencies: {} },
      additionalProjects: [
        {
          project: 'lib1',
          projectRoot: '/root/libs/lib1'
        },
        {
          project: 'lib2',
          projectRoot: '/root/libs/lib2'
        }
      ]
    });

    mockTryBump.mockReturnValue(of({ version: '2.1.0', previousVersion: '2.0.0', dependencyUpdates: [] }));
    mockUpdateChangelog.mockImplementation(({ projectRoot }) => of(getChangelogPath(projectRoot)));
    mockUpdatePackageJson.mockImplementation(({ projectRoot }) => of(getPackageJsonPath(projectRoot)));
    mockShouldSkipPrivateProject.mockReturnValue(false);
    mockCalculateChangelogChanges.mockReturnValue(source => {
      source.subscribe();
      return of('');
    });
    mockInsertChangelogDependencyUpdates.mockReturnValue(of(''));
    mockTryPush.mockReturnValue(of(''));
    mockGetLastCommitHash.mockReturnValue(of(LAST_COMMIT_HASH));
    mockAddToStage.mockReturnValue(of(undefined));
    mockCommit.mockReturnValue(of(undefined));
    mockCreateTag.mockReturnValue(of(''));
    mockRunPostTargets.mockReturnValue(of(undefined));
    mockGetDependencyRoots.mockResolvedValue([]);

    jest
      .spyOn(workspace, 'getProjectRoots')
      .mockReturnValue(['/root/packages/a', '/root/packages/b', '/root/libs/lib1', '/root/libs/lib2']);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should run tasks in order', async () => {
    const { success } = await version({ ...options, push: true, postTargets: ['a:publish'] }, context);

    expect(success).toBe(true);
    expect(mockTryBump).toHaveBeenCalledBefore(mockUpdateChangelog);
    expect(mockUpdateChangelog).toHaveBeenCalledBefore(mockUpdatePackageJson);
    expect(mockCommit).toHaveBeenCalledBefore(mockCreateTag);
    expect(mockCreateTag).toHaveBeenCalledBefore(mockTryPush);
    expect(mockTryPush).toHaveBeenCalledBefore(mockRunPostTargets);
  });

  it('should version with --releaseType', async () => {
    const { success } = await version({ ...options, releaseType: 'major' }, context);

    expect(success).toBe(true);
    expect(mockTryBump).toBeCalledWith(expect.objectContaining({ releaseType: 'major' }));
    expect(mockUpdateChangelog).toBeCalledWith(expect.objectContaining({ newVersion: '2.1.0' }));
    expect(mockUpdatePackageJson).toBeCalledWith(expect.objectContaining({ newVersion: '2.1.0' }));
    expect(mockCommit).toBeCalledWith(expect.objectContaining({ commitMessage: 'chore(a): release version 2.1.0' }));
    expect(mockCreateTag).toBeCalledWith(expect.objectContaining({ tag: 'a@2.1.0' }));
  });

  it('should version with --noVerify', async () => {
    const { success } = await version({ ...options, noVerify: true }, context);

    expect(success).toBe(true);
    expect(mockCommit).toBeCalledWith(expect.objectContaining({ noVerify: true }));
  });

  it('should skip changelog and package.json update with --dryRun', async () => {
    const { success } = await version({ ...options, dryRun: true }, context);

    expect(success).toBe(true);
    expect(mockUpdatePackageJson).toBeCalledWith(expect.objectContaining({ dryRun: true }));
    expect(mockUpdateChangelog).toBeCalledWith(expect.objectContaining({ dryRun: true }));
  });

  describe('--skipCommit', () => {
    it('should not make a commit', async () => {
      const { success } = await version({ ...options, skipCommit: true }, context);

      expect(success).toBe(true);
      expect(mockCommit).toBeCalledWith(expect.objectContaining({ skipCommit: true }));
    });

    it('should put tag on last commit in a library', async () => {
      const { success } = await version({ ...options, skipCommit: true }, context);

      expect(success).toBe(true);
      expect(mockCreateTag).toBeCalledWith(expect.objectContaining({ commitHash: LAST_COMMIT_HASH }));
    });
  });

  describe('--skipTag', () => {
    it('should not create tag', async () => {
      const { success } = await version({ ...options, skipTag: true }, context);

      expect(success).toBe(true);
      expect(mockCreateTag).toBeCalledWith(expect.objectContaining({ skipTag: true }));
    });
  });

  describe('--skipPrivate', () => {
    it('should skip tasks for private project', async () => {
      mockShouldSkipPrivateProject.mockReturnValue(true);

      const { success } = await version({ ...options, skipPrivate: true }, context);

      expect(success).toBe(true);
      expect(mockTryBump).toBeCalledWith(expect.objectContaining({ skipProject: true }));
      expect(mockUpdateChangelog).not.toBeCalled();
      expect(mockCommit).toBeCalledWith(expect.objectContaining({ skipCommit: true }));
      expect(mockCreateTag).toBeCalledWith(expect.objectContaining({ skipTag: true }));
      expect(mockTryPush).not.toBeCalled();
      expect(mockRunPostTargets).not.toBeCalled();
    });
  });

  describe('--independent (independent mode)', () => {
    it('should version independently a project', async () => {
      const { success } = await version({ ...options, syncVersions: false }, context);

      expect(success).toBe(true);
      expect(mockTryBump).toBeCalledWith(expect.objectContaining({ dependencyRoots: [] }));
      expect(mockUpdateChangelog).toBeCalledWith(expect.objectContaining({ newVersion: '2.1.0' }));
      expect(mockUpdatePackageJson).toBeCalledWith(expect.objectContaining({ newVersion: '2.1.0' }));
      expect(mockCommit).toBeCalledWith(expect.objectContaining({ commitMessage: 'chore(a): release version 2.1.0' }));
      expect(mockCreateTag).toBeCalledWith(expect.objectContaining({ tag: 'a@2.1.0' }));
    });

    it('should version independently a project with dependencies', async () => {
      mockGetDependencyRoots.mockResolvedValue([
        { name: 'lib1', path: '/root/libs/lib1' },
        { name: 'lib2', path: '/root/libs/lib2' }
      ]);

      const { success } = await version({ ...options, syncVersions: false, trackDeps: true }, context);

      expect(success).toBe(true);
      expect(mockTryBump).toBeCalledWith(
        expect.objectContaining({
          dependencyRoots: [
            { name: 'lib1', path: '/root/libs/lib1' },
            { name: 'lib2', path: '/root/libs/lib2' }
          ]
        })
      );
      expect(mockUpdateChangelog).toBeCalledWith(expect.objectContaining({ newVersion: '2.1.0' }));
      expect(mockUpdatePackageJson).toBeCalledWith(expect.objectContaining({ newVersion: '2.1.0' }));
      expect(mockCommit).toBeCalledWith(expect.objectContaining({ commitMessage: 'chore(a): release version 2.1.0' }));
      expect(mockCreateTag).toBeCalledWith(expect.objectContaining({ tag: 'a@2.1.0' }));
    });

    it('should version independently a project with failure dependencies', async () => {
      mockGetDependencyRoots.mockRejectedValue('thrown error');

      const { success } = await version({ ...options, syncVersions: false, trackDeps: true }, context);

      expect(success).toBe(false);
      expect(logger.error).toBeCalledWith(expect.stringContaining('Failed to determine dependencies.'));
      expect(mockTryBump).not.toBeCalled();
      expect(mockUpdateChangelog).not.toBeCalled();
      expect(mockUpdatePackageJson).not.toBeCalled();
      expect(mockCommit).not.toBeCalled();
      expect(mockCreateTag).not.toBeCalled();
    });

    it('should resolve ${projectName} tagPrefix interpolation', async () => {
      const { success } = await version(
        { ...options, syncVersions: false, tagPrefix: 'custom-tag-prefix/${projectName}-' },
        context
      );

      expect(success).toBe(true);
      expect(mockCreateTag).toBeCalledWith(expect.objectContaining({ tag: 'custom-tag-prefix/a-2.1.0' }));
    });

    it('should not version if no commits since last release', async () => {
      mockTryBump.mockReturnValue(of(null));

      const { success } = await version({ ...options, syncVersions: false }, context);

      expect(success).toBe(true);
      expect(logger.info).toBeCalledWith(expect.stringContaining('Nothing changed since last release.'));
      expect(mockUpdateChangelog).not.toBeCalled();
      expect(mockUpdatePackageJson).not.toBeCalled();
      expect(mockCommit).not.toBeCalled();
      expect(mockCreateTag).not.toBeCalled();
    });

    it('should skip changelog generation with --skipProjectChangelog', async () => {
      const { success } = await version({ ...options, syncVersions: false, skipProjectChangelog: true }, context);

      expect(success).toBe(true);
      expect(mockUpdateChangelog).not.toBeCalled();
      expect(mockUpdatePackageJson).toBeCalled();
      expect(mockCommit).toBeCalled();
      expect(mockCreateTag).toBeCalled();
    });
  });

  describe('--independent=false (synced mode)', () => {
    beforeEach(() => {
      context = createTestingContext({
        project: 'workspace',
        projectRoot: '/root',
        workspaceRoot: '/root',
        additionalProjects: [
          {
            project: 'a',
            projectRoot: 'packages/a'
          },
          {
            project: 'b',
            projectRoot: 'packages/b'
          }
        ]
      });

      jest.spyOn(workspace, 'getProjectRoots').mockReturnValue(['/root/packages/a', '/root/packages/b', '/root']);
    });

    it('should commit and tag', async () => {
      const { success } = await version({ ...options, syncVersions: true }, context);

      expect(success).toBe(true);
      expect(mockCreateTag).toBeCalledWith(
        expect.objectContaining({
          commitMessage: 'chore(workspace): release version 2.1.0',
          dryRun: false,
          projectName: 'workspace',
          tag: 'v2.1.0'
        })
      );
      expect(mockCommit).toBeCalledWith(
        expect.objectContaining({
          commitMessage: 'chore(workspace): release version 2.1.0',
          dryRun: false,
          noVerify: false,
          projectName: 'workspace'
        })
      );
    });

    it('should update package.json files', async () => {
      const { success } = await version({ ...options, syncVersions: true }, context);

      expect(success).toBe(true);
      expect(mockUpdatePackageJson).toBeCalledTimes(3);
      expect(mockUpdatePackageJson.mock.calls[0][0]).toEqual(
        expect.objectContaining({
          newVersion: '2.1.0',
          projectRoot: '/root/packages/a'
        })
      );
      expect(mockUpdatePackageJson.mock.calls[1][0]).toEqual(
        expect.objectContaining({
          newVersion: '2.1.0',
          projectRoot: '/root/packages/b'
        })
      );
      expect(mockUpdatePackageJson.mock.calls[2][0]).toEqual(
        expect.objectContaining({
          newVersion: '2.1.0',
          projectRoot: '/root'
        })
      );
    });

    it('should update changelogs', async () => {
      const { success } = await version({ ...options, syncVersions: true }, context);

      expect(success).toBe(true);
      expect(mockUpdateChangelog).toBeCalledTimes(3);
      expect(mockUpdateChangelog.mock.calls[0][0]).toEqual(
        expect.objectContaining({
          newVersion: '2.1.0',
          projectRoot: '/root/packages/a'
        })
      );
      expect(mockUpdateChangelog.mock.calls[1][0]).toEqual(
        expect.objectContaining({
          newVersion: '2.1.0',
          projectRoot: '/root/packages/b'
        })
      );
      expect(mockUpdateChangelog.mock.calls[2][0]).toEqual(
        expect.objectContaining({
          newVersion: '2.1.0',
          projectRoot: '/root'
        })
      );
    });

    it('should skip root changelog generation with --skipRootChangelog', async () => {
      const { success } = await version({ ...options, syncVersions: true, skipRootChangelog: true }, context);

      expect(success).toBe(true);
      expect(mockUpdateChangelog).toBeCalledTimes(2);
      expect(mockUpdateChangelog.mock.calls[0][0]).toEqual(
        expect.objectContaining({
          newVersion: '2.1.0',
          projectRoot: '/root/packages/a'
        })
      );
      expect(mockUpdateChangelog.mock.calls[1][0]).toEqual(
        expect.objectContaining({
          newVersion: '2.1.0',
          projectRoot: '/root/packages/b'
        })
      );
    });

    it('should skip project changelog generation with --skipProjectChangelog', async () => {
      const { success } = await version({ ...options, syncVersions: true, skipProjectChangelog: true }, context);

      expect(success).toBe(true);
      expect(mockUpdateChangelog).toBeCalledTimes(1);
      expect(mockUpdateChangelog).toBeCalledWith(
        expect.objectContaining({
          newVersion: '2.1.0',
          projectRoot: '/root'
        })
      );
    });

    it('should not version if no commits since last release', async () => {
      mockTryBump.mockReturnValue(of(null));

      const { success } = await version({ ...options, syncVersions: false }, context);

      expect(success).toBe(true);
      expect(logger.info).toBeCalledWith(expect.stringContaining('Nothing changed since last release.'));
      expect(mockUpdateChangelog).not.toBeCalled();
      expect(mockUpdatePackageJson).not.toBeCalled();
      expect(mockCommit).not.toBeCalled();
      expect(mockCreateTag).not.toBeCalled();
    });
  });

  describe('--commitMessageFormat', () => {
    it('should handle given format', async () => {
      const { success } = await version(
        { ...options, commitMessageFormat: 'chore: bump "${projectName}" to ${version} [skip ci]' },
        context
      );

      expect(success).toBe(true);
      expect(mockCommit).toBeCalledWith(
        expect.objectContaining({ commitMessage: 'chore: bump "a" to 2.1.0 [skip ci]' })
      );
    });

    it('should commit with default format', async () => {
      const { success } = await version(options, context);

      expect(success).toBe(true);
      expect(mockCommit).toBeCalledWith(expect.objectContaining({ commitMessage: 'chore(a): release version 2.1.0' }));
    });
  });

  describe('--push', () => {
    it('should push to Git', async () => {
      mockTryPush.mockReturnValue(of('success'));

      const { success } = await version({ ...options, push: true }, context);

      expect(success).toBe(true);
      expect(mockTryPush).toBeCalledWith(
        expect.objectContaining({
          remote: 'origin',
          branch: 'main',
          noVerify: false
        })
      );
    });

    it('should handle Git failure', async () => {
      mockTryPush.mockReturnValue(throwError(() => new Error('Something went wrong')));

      const { success } = await version({ ...options, push: true }, context);

      expect(success).toBe(false);
      expect(logger.error).toBeCalledWith(expect.stringContaining('Error: Something went wrong'));
    });

    it('should not push to Git by default', async () => {
      await version(options, context);

      expect(mockTryPush).not.toBeCalled();
    });

    it('should not push to Git when with --dryRun', async () => {
      await version({ ...options, dryRun: true }, context);

      expect(mockTryPush).not.toBeCalled();
    });
  });

  describe('--postTargets', () => {
    it('should successfully execute post targets', async () => {
      const { success } = await version(
        { ...options, postTargets: ['project-a:test', 'project-b:test', 'project-c:test:prod'] },
        context
      );

      expect(success).toBe(true);
      expect(mockRunPostTargets).toBeCalledWith(
        expect.objectContaining({
          templateStringContext: {
            dryRun: false,
            notes: '',
            projectName: 'a',
            tag: 'a@2.1.0',
            version: '2.1.0',
            previousTag: 'a@2.0.0'
          }
        })
      );
    });

    it('should handle post targets failure', async () => {
      mockRunPostTargets.mockReturnValue(throwError(() => new Error('Nop!')));

      const { success } = await version({ ...options, postTargets: ['project-a:test'] }, context);

      expect(success).toBe(false);
      expect(logger.error).toBeCalledWith(expect.stringContaining('Nop!'));
    });

    it('should skip post targets with --dryRun', async () => {
      const { success } = await version(
        { ...options, dryRun: true, postTargets: ['project-a:test', 'project-b:test:prod'] },
        context
      );

      expect(success).toBe(true);
      expect(mockRunPostTargets).not.toBeCalled();
    });

    it('should execute post targets after the bump occurred', async () => {
      const { success } = await version({ ...options, postTargets: ['project-a:test'] }, context);

      expect(success).toBe(true);
      expect(mockTryBump).toHaveBeenCalledBefore(mockRunPostTargets);
    });

    it('should skip executing post targets if no bump occurred', async () => {
      mockTryBump.mockReturnValue(of(null));

      const { success } = await version({ ...options, postTargets: ['project-a:test'] }, context);

      expect(success).toBe(true);
      expect(mockRunPostTargets).not.toBeCalled();
    });
  });

  describe('--changelogPreset', () => {
    it('should use --changelogPreset=angular by default', async () => {
      const { success } = await version({ ...options, changelogPreset: undefined }, context);

      expect(success).toBe(true);
      expect(mockUpdateChangelog).toBeCalledWith(expect.objectContaining({ changelogPreset: 'angular' }));
    });

    it('should use --changelogPreset=conventionalcommits', async () => {
      const { success } = await version({ ...options, changelogPreset: 'conventionalcommits' }, context);

      expect(success).toBe(true);
      expect(mockUpdateChangelog).toBeCalledWith(expect.objectContaining({ changelogPreset: 'conventionalcommits' }));
    });

    it('should use --changelogPreset=conventional-changelog-config-spec', async () => {
      const { success } = await version(
        {
          ...options,
          changelogPreset: {
            name: 'conventionalcommits',
            compareUrlFormat: '{{host}}/{{owner}}/{{repository}}/compareee/{{previousTag}}...{{{currentTag}}'
          }
        },
        context
      );

      expect(success).toBe(true);
      expect(mockUpdateChangelog).toBeCalledWith(
        expect.objectContaining({
          changelogPreset: {
            name: 'conventionalcommits',
            compareUrlFormat: '{{host}}/{{owner}}/{{repository}}/compareee/{{previousTag}}...{{{currentTag}}'
          }
        })
      );
    });
  });

  describe('--changelogHeader', () => {
    const customChangelogHeader = `# Custom Changelog Header`;

    it('should use --changelogHeader=defaultHeader by default', async () => {
      const { success } = await version(options, context);

      expect(success).toBe(true);
      expect(mockUpdateChangelog).toBeCalledWith(expect.objectContaining({ changelogHeader: defaultHeader }));
    });

    it('should use --changelogHeader=${customChangelogHeader}', async () => {
      const { success } = await version({ ...options, changelogHeader: customChangelogHeader }, context);

      expect(success).toBe(true);
      expect(mockUpdateChangelog).toBeCalledWith(expect.objectContaining({ changelogHeader: customChangelogHeader }));
    });
  });
});
