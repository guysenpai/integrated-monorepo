import { of } from 'rxjs';

import { createTestingContext } from '../utils/testing';
import executor from './executor';
import { buildProject } from './utils/build-project';
import { getDistPath } from './utils/dist-path';
import { publish } from './utils/publish';

import type { ExecutorContext } from '@nrwl/devkit';
import type { NpmExecutorSchema } from './schema';

jest.mock('./utils/build-project');
jest.mock('./utils/dist-path');
jest.mock('./utils/publish');

describe('Npm Executor', () => {
  const mockBuildProject = buildProject as jest.MockedFunction<typeof buildProject>;
  const mockGetDistPath = getDistPath as jest.MockedFunction<typeof getDistPath>;
  const mockPublish = publish as jest.MockedFunction<typeof publish>;

  let context: ExecutorContext;
  const options: NpmExecutorSchema = {
    buildTarget: 'build',
    noBuild: false,
    access: 'public',
    dryRun: false
  };

  beforeEach(() => {
    context = createTestingContext({
      project: 'a',
      projectRoot: '/root/packages/a',
      workspaceRoot: '/root',
      projectGraph: { nodes: {}, dependencies: {} }
    });

    mockBuildProject.mockReturnValue(of({ project: 'a', target: 'build' }));
    mockGetDistPath.mockReturnValue(of('/root/dist/packages/a'));
    mockPublish.mockReturnValue(of('success'));
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should run tasks in order', async () => {
    const { success } = await executor(options, context);

    expect(success).toBe(true);
    expect(mockBuildProject).toHaveBeenCalledBefore(mockGetDistPath);
    expect(mockGetDistPath).toHaveBeenCalledBefore(mockPublish);
  });

  it('should publish with --distFolderPath', async () => {
    mockGetDistPath.mockReturnValue(of('/root/dist/a'));

    const { success } = await executor({ ...options, distFolderPath: '/root/dist/a' }, context);

    expect(success).toBe(true);
    expect(mockPublish).toBeCalledWith(expect.objectContaining({ distPath: '/root/dist/a' }));
  });

  it('should skip project build with --noBuild', async () => {
    const { success } = await executor({ ...options, noBuild: true }, context);

    expect(success).toBe(true);
    expect(mockBuildProject).toBeCalledWith(expect.objectContaining({ noBuild: true }));
  });
});
