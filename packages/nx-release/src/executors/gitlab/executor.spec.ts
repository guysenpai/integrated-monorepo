import { of, throwError } from 'rxjs';
import { logger } from '@nrwl/devkit';

import { exec } from '../utils/exec';
import executor from './executor';

import type { GitlabExecutorSchema } from './schema';

jest.mock('../utils/exec');

const options: GitlabExecutorSchema = {
  tag: 'v1.0.0'
};

describe('Gitlab Executor', () => {
  const mockExec = exec as jest.Mock;

  beforeEach(() => {
    mockExec.mockImplementation(() => of({ stdout: 'success' }));
  });

  afterEach(() => {
    mockExec.mockReset();
  });

  it('should create release', async () => {
    const output = await executor(options);

    expect(mockExec).toBeCalledWith('glab', expect.arrayContaining(['release', 'create', 'v1.0.0']));
    expect(output.success).toBe(true);
  });

  it('should create release by specifying --ref', async () => {
    const output = await executor({ ...options, ref: 'next' });

    expect(mockExec).toBeCalledWith('glab', expect.arrayContaining(['--ref', 'next']));
    expect(output.success).toBe(true);
  });

  it('should create release by specifying --name', async () => {
    const output = await executor({ ...options, name: 'Title for release' });

    expect(mockExec).toBeCalledWith('glab', expect.arrayContaining(['--name', 'Title for release']));
    expect(output.success).toBe(true);
  });

  it('should create release by specifying --notes', async () => {
    const output = await executor({ ...options, notes: 'bugfix release' });

    expect(mockExec).toBeCalledWith('glab', expect.arrayContaining(['--notes', 'bugfix release']));
    expect(output.success).toBe(true);
  });

  it('should create release by specifying --notesFile', async () => {
    const output = await executor({ ...options, notesFile: 'libs/my-lib/changelog.md' });

    expect(mockExec).toBeCalledWith('glab', expect.arrayContaining(['--notes-file', 'libs/my-lib/changelog.md']));
    expect(output.success).toBe(true);
  });

  it('should create release by specifying --milestones', async () => {
    const output = await executor({ ...options, milestones: ['v1.0.0'] });

    expect(mockExec).toBeCalledWith('glab', expect.arrayContaining(['--milestone', 'v1.0.0']));
    expect(output.success).toBe(true);
  });

  it('should create release by specifying --releasedAt', async () => {
    const output = await executor({ ...options, releasedAt: 'XYZ' });

    expect(mockExec).toBeCalledWith('glab', expect.arrayContaining(['--released-at', 'XYZ']));
    expect(output.success).toBe(true);
  });

  it('should create release by specifying --repo', async () => {
    const output = await executor({ ...options, repo: 'repo:MYORG/REPO' });

    expect(mockExec).toBeCalledWith('glab', expect.arrayContaining(['--repo', 'repo:MYORG/REPO']));
    expect(output.success).toBe(true);
  });

  it('should handle Github CLI errors', async () => {
    mockExec.mockImplementation(() => throwError(() => ({ stderr: 'something went wrong' })));
    jest.spyOn(logger, 'error').mockImplementation();

    const output = await executor(options);

    expect(logger.error).toBeCalled();
    expect(output.success).toBe(false);
  });

  describe('--assets', () => {
    it('should upload all assets in a specifed folder', async () => {
      const output = await executor({
        ...options,
        assets: ['./dist/*']
      });

      expect(mockExec).toBeCalledWith('glab', expect.arrayContaining(['./dist/*']));
      expect(output.success).toBe(true);
    });

    it('should upload all tarballs in a specifed folder', async () => {
      const output = await executor({
        ...options,
        assets: ['./dist/*.tgz']
      });

      expect(mockExec).toBeCalledWith('glab', expect.arrayContaining(['./dist/*.tgz']));
      expect(output.success).toBe(true);
    });

    it('should upload a release asset', async () => {
      const output = await executor({
        ...options,
        assets: ['/path/to/asset1.zip', { url: '/path/to/asset2.zip' }]
      });

      expect(mockExec).toBeCalledWith('glab', expect.arrayContaining(['/path/to/asset1.zip', '/path/to/asset2.zip']));
      expect(output.success).toBe(true);
    });

    it('should upload a release asset with display name', async () => {
      const output = await executor({
        ...options,
        assets: ['/path/to/asset1.zip#Asset1', { url: '/path/to/asset2.zip', name: 'Asset2' }]
      });

      expect(mockExec).toBeCalledWith(
        'glab',
        expect.arrayContaining(['/path/to/asset1.zip#Asset1', '/path/to/asset2.zip#Asset2'])
      );
      expect(output.success).toBe(true);
    });

    it('should upload a release asset with display name and type', async () => {
      const output = await executor({
        ...options,
        assets: ['/path/to/asset1.png#Asset1#image', { url: '/path/to/asset2.zip', name: 'Asset2', type: 'other' }]
      });

      expect(mockExec).toBeCalledWith(
        'glab',
        expect.arrayContaining(['/path/to/asset1.png#Asset1#image', '/path/to/asset2.zip#Asset2#other'])
      );
      expect(output.success).toBe(true);
    });

    it('should create a release with assets specified as JSON object', async () => {
      const output = await executor({
        ...options,
        assets: [{ name: 'Asset1', url: 'https://<domain>/some/location/1', type: 'other', filepath: 'path/to/file' }]
      });

      expect(mockExec).toBeCalledWith(
        'glab',
        expect.arrayContaining([
          '--assets-links',
          `[{ "name": "Asset1", "url": "https://<domain>/some/location/1", "link_type": "other", "filepath": "path/to/file" }]`
        ])
      );
      expect(output.success).toBe(true);
    });
  });
});
