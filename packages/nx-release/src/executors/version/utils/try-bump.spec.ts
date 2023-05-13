import { logger } from '@nrwl/devkit';
import conventionalRecommendedBump from 'conventional-recommended-bump';
import gitSemverTags from 'git-semver-tags';
import { lastValueFrom, of, throwError } from 'rxjs';
import { callbackify } from 'util';

import { getLastVersion } from './get-last-version';
import { getCommits, getFirstCommitRef } from './git';
import { tryBump } from './try-bump';

jest.mock('conventional-recommended-bump');
jest.mock('git-semver-tags', () => jest.fn());
jest.mock('./get-last-version');
jest.mock('./git');

describe('tryBump', () => {
  const mockConventionalRecommendedBump = conventionalRecommendedBump as jest.MockedFunction<
    typeof conventionalRecommendedBump
  >;
  const mockGetLastVersion = getLastVersion as jest.MockedFunction<typeof getLastVersion>;
  const mockGetCommits = getCommits as jest.MockedFunction<typeof getCommits>;
  const mockGetFirstCommitRef = getFirstCommitRef as jest.MockedFunction<typeof getFirstCommitRef>;

  let mockGitSemverTags: jest.Mock;

  beforeEach(() => {
    mockGitSemverTags = jest.fn();
    (gitSemverTags as jest.Mock).mockImplementation(callbackify(mockGitSemverTags));
    mockGetLastVersion.mockReturnValue(of('2.1.0'));
    jest.spyOn(logger, 'warn').mockImplementation();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should compute the next version based on last version and changes', async () => {
    mockGetCommits.mockReturnValue(of(['feat: A', 'feat: B']));
    // Mock bump to return "minor"
    mockConventionalRecommendedBump.mockImplementation(
      callbackify(jest.fn().mockResolvedValue({ releaseType: 'minor' })) as () => void
    );

    const newVersion = await lastValueFrom(
      tryBump({
        syncVersions: false,
        changelogPreset: 'angular',
        projectRoot: '/libs/demo',
        tagPrefix: 'v',
        releaseType: undefined,
        preid: undefined,
        skipCommitTypes: [],
        projectName: ''
      })
    );

    expect(newVersion?.version).toEqual('2.2.0');
    expect(newVersion?.previousVersion).toEqual('2.1.0');
    expect(mockGetCommits).toBeCalledTimes(1);
    expect(mockGetCommits).toBeCalledWith({
      projectRoot: '/libs/demo',
      since: 'v2.1.0'
    });

    expect(mockConventionalRecommendedBump).toBeCalledTimes(1);
    expect(mockConventionalRecommendedBump).toBeCalledWith(
      {
        path: '/libs/demo',
        preset: 'angular',
        tagPrefix: 'v'
      },
      expect.any(Function)
    );
  });

  it('should compute the next version based on last version, changes and dependencies', async () => {
    mockGetCommits
      .mockReturnValueOnce(of(['chore: A', 'chore: B']))
      .mockReturnValueOnce(of(['chore: A', 'chore: B']))
      .mockReturnValueOnce(of(['fix: A', 'feat: B']));
    // Mock bump to return "minor"
    mockConventionalRecommendedBump.mockImplementation(
      callbackify(
        jest
          .fn()
          .mockResolvedValueOnce({ releaseType: undefined })
          .mockResolvedValueOnce({ releaseType: undefined })
          .mockResolvedValueOnce({ releaseType: 'minor' })
      ) as () => void
    );

    const newVersion = await lastValueFrom(
      tryBump({
        changelogPreset: 'angular',
        projectRoot: '/libs/demo',
        dependencyRoots: [
          { name: 'dep1', path: '/libs/dep1' },
          { name: 'dep2', path: '/libs/dep2' }
        ],
        tagPrefix: 'v',
        syncVersions: true,
        skipCommitTypes: [],
        projectName: ''
      })
    );

    expect(newVersion?.version).toEqual('2.1.1');
    expect(mockGetCommits).toBeCalledTimes(3);
    expect(mockGetCommits).toBeCalledWith({
      projectRoot: '/libs/demo',
      since: 'v2.1.0'
    });
    expect(mockGetCommits).toBeCalledWith({
      projectRoot: '/libs/dep1',
      since: 'v2.1.0'
    });
    expect(mockGetCommits).toBeCalledWith({
      projectRoot: '/libs/dep2',
      since: 'v2.1.0'
    });

    expect(mockConventionalRecommendedBump).toBeCalledTimes(1);
    expect(mockConventionalRecommendedBump).toBeCalledWith(
      {
        path: '/libs/demo',
        preset: 'angular',
        tagPrefix: 'v'
      },
      expect.any(Function)
    );
  });

  it('should use given release type to calculate the next version', async () => {
    mockGetCommits.mockReturnValue(of(['feat: A', 'feat: B']));

    const newVersion = await lastValueFrom(
      tryBump({
        syncVersions: false,
        changelogPreset: 'angular',
        projectRoot: '/libs/demo',
        tagPrefix: 'v',
        releaseType: 'premajor',
        skipCommitTypes: [],
        preid: 'alpha',
        projectName: ''
      })
    );

    expect(newVersion?.version).toEqual('3.0.0-alpha.0');
    expect(mockConventionalRecommendedBump).not.toBeCalled();
    expect(mockGetCommits).toBeCalledTimes(1);
    expect(mockGetCommits).toBeCalledWith({
      projectRoot: '/libs/demo',
      since: 'v2.1.0'
    });
  });

  it('should use prerelease to calculate next major release version', async () => {
    mockGitSemverTags.mockResolvedValue(['my-lib-3.0.0-beta.0', 'my-lib-2.1.0', 'my-lib-2.0.0', 'my-lib-1.0.0']);
    mockGetCommits.mockReturnValue(of(['feat: A', 'feat: B']));

    const newVersion = await lastValueFrom(
      tryBump({
        syncVersions: false,
        changelogPreset: 'angular',
        projectRoot: '/libs/demo',
        tagPrefix: 'v',
        releaseType: 'major',
        skipCommitTypes: [],
        projectName: ''
      })
    );

    expect(newVersion).toEqual({
      version: '3.0.0',
      previousVersion: '2.1.0',
      dependencyUpdates: []
    });
    expect(mockConventionalRecommendedBump).not.toBeCalled();
    expect(mockGetCommits).toBeCalledTimes(1);
    expect(mockGetCommits).toBeCalledWith({
      projectRoot: '/libs/demo',
      since: 'v2.1.0'
    });
  });

  it('should use prerelease to calculate next minor release version', async () => {
    mockGitSemverTags.mockResolvedValue(['my-lib-2.2.0-beta.0', 'my-lib-2.1.0', 'my-lib-2.0.0', 'my-lib-1.0.0']);
    mockGetCommits.mockReturnValue(of(['feat: A', 'feat: B']));

    const newVersion = await lastValueFrom(
      tryBump({
        syncVersions: false,
        changelogPreset: 'angular',
        projectRoot: '/libs/demo',
        tagPrefix: 'v',
        releaseType: 'minor',
        skipCommitTypes: [],
        projectName: ''
      })
    );

    expect(newVersion).toEqual({
      version: '2.2.0',
      previousVersion: '2.1.0',
      dependencyUpdates: []
    });
    expect(mockConventionalRecommendedBump).not.toBeCalled();
    expect(mockGetCommits).toBeCalledTimes(1);
    expect(mockGetCommits).toBeCalledWith({
      projectRoot: '/libs/demo',
      since: 'v2.1.0'
    });
  });

  it('should use prerelease to calculate next patch release version', async () => {
    mockGitSemverTags.mockResolvedValue(['my-lib-2.1.1-beta.0', 'my-lib-2.1.0', 'my-lib-2.0.0', 'my-lib-1.0.0']);
    mockGetCommits.mockReturnValue(of(['feat: A', 'feat: B']));

    const newVersion = await lastValueFrom(
      tryBump({
        syncVersions: false,
        changelogPreset: 'angular',
        projectRoot: '/libs/demo',
        tagPrefix: 'v',
        releaseType: 'patch',
        skipCommitTypes: [],
        projectName: ''
      })
    );

    expect(newVersion).toEqual({
      version: '2.1.1',
      previousVersion: '2.1.0',
      dependencyUpdates: []
    });
    expect(mockConventionalRecommendedBump).not.toBeCalled();
    expect(mockGetCommits).toBeCalledTimes(1);
    expect(mockGetCommits).toBeCalledWith({
      projectRoot: '/libs/demo',
      since: 'v2.1.0'
    });
  });

  it('should use given type to calculate next version if there are no changes', async () => {
    mockGetCommits.mockReturnValue(of([]));

    const newVersion = await lastValueFrom(
      tryBump({
        syncVersions: false,
        changelogPreset: 'angular',
        projectRoot: '/libs/demo',
        tagPrefix: 'v',
        releaseType: 'patch',
        skipCommitTypes: [],
        projectName: ''
      })
    );

    expect(newVersion?.version).toEqual('2.1.1');
    expect(newVersion?.previousVersion).toEqual('2.1.0');
    expect(mockConventionalRecommendedBump).not.toBeCalled();
  });

  it('should call getFirstCommitRef if version is 0.0.0', async () => {
    mockGetLastVersion.mockReturnValue(throwError(() => 'No version found'));
    mockGetCommits.mockReturnValue(of([]));
    mockGetFirstCommitRef.mockReturnValue(of('sha1'));
    mockConventionalRecommendedBump.mockImplementation(
      callbackify(jest.fn().mockResolvedValue({ releaseType: undefined })) as () => void
    );

    await lastValueFrom(
      tryBump({
        syncVersions: false,
        changelogPreset: 'angular',
        projectRoot: '/libs/demo',
        tagPrefix: 'v',
        projectName: '',
        skipCommitTypes: []
      })
    );

    expect(logger.warn).toBeCalledWith(expect.stringContaining('No previous version tag found'));
    expect(mockGetCommits).toBeCalledTimes(1);
    expect(mockGetCommits).toBeCalledWith({
      projectRoot: '/libs/demo',
      since: 'sha1'
    });
  });

  it('should return undefined if there are no changes in current path', async () => {
    mockGetCommits.mockReturnValue(of([]));
    mockConventionalRecommendedBump.mockImplementation(
      callbackify(jest.fn().mockResolvedValue({ releaseType: 'patch' })) as () => void
    );

    const newVersion = await lastValueFrom(
      tryBump({
        syncVersions: false,
        changelogPreset: 'angular',
        projectRoot: '/libs/demo',
        tagPrefix: 'v',
        projectName: '',
        skipCommitTypes: []
      })
    );

    expect(newVersion).toBeNull();
    expect(mockGetCommits).toBeCalledWith({
      projectRoot: '/libs/demo',
      since: 'v2.1.0'
    });
  });

  it('should try to do bump even if there are no changes in current path when allowEmptyRelease is true', async () => {
    mockGetCommits.mockReturnValue(of([]));
    mockConventionalRecommendedBump.mockImplementation(
      callbackify(jest.fn().mockResolvedValue({ releaseType: 'patch' })) as () => void
    );

    const newVersion = await lastValueFrom(
      tryBump({
        syncVersions: false,
        changelogPreset: 'angular',
        projectRoot: '/libs/demo',
        tagPrefix: 'v',
        allowEmptyRelease: true,
        projectName: '',
        skipCommitTypes: []
      })
    );

    expect(newVersion?.version).toEqual('2.1.1');
    expect(mockGetCommits).toBeCalledWith({
      projectRoot: '/libs/demo',
      since: 'v2.1.0'
    });
  });

  describe('--skipCommitTypes', () => {
    it('should return undefined if all commits types match skipCommitTypes', async () => {
      mockGetCommits.mockReturnValue(of(['docs: A', 'refactor: B']));
      mockConventionalRecommendedBump.mockImplementation(
        callbackify(jest.fn().mockResolvedValue({ releaseType: 'patch' })) as () => void
      );

      const newVersion = await lastValueFrom(
        tryBump({
          syncVersions: false,
          changelogPreset: 'angular',
          projectRoot: '/libs/demo',
          tagPrefix: 'v',
          projectName: '',
          skipCommitTypes: ['docs', 'refactor']
        })
      );

      expect(newVersion).toBeNull();
    });

    it('should return correct version if NOT commits types match skipCommitTypes', async () => {
      mockGetCommits.mockReturnValue(of(['feat: A', 'docs: B']));
      mockConventionalRecommendedBump.mockImplementation(
        callbackify(jest.fn().mockResolvedValue({ releaseType: 'patch' })) as () => void
      );

      const newVersion = await lastValueFrom(
        tryBump({
          syncVersions: false,
          changelogPreset: 'angular',
          projectRoot: '/libs/demo',
          tagPrefix: 'v',
          projectName: '',
          skipCommitTypes: ['docs', 'refactor']
        })
      );

      expect(newVersion?.version).toEqual('2.1.1');
    });

    it('should return undefined if all dependency commits types match skipCommitTypes', async () => {
      mockGetCommits.mockReturnValueOnce(of([])).mockReturnValueOnce(of(['docs: A', 'refactor(scope): B']));
      mockConventionalRecommendedBump.mockImplementation(
        callbackify(
          jest.fn().mockResolvedValueOnce({ releaseType: undefined }).mockResolvedValueOnce({ releaseType: undefined })
        ) as () => void
      );

      const newVersion = await lastValueFrom(
        tryBump({
          syncVersions: true,
          changelogPreset: 'angular',
          projectRoot: '/libs/demo',
          dependencyRoots: [{ name: 'dep1', path: '/libs/dep1' }],
          tagPrefix: 'v',
          projectName: '',
          skipCommitTypes: ['docs', 'refactor']
        })
      );

      expect(newVersion).toBeNull();
    });
  });
});
