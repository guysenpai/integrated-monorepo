import { of, throwError } from 'rxjs';
import { exec } from '../utils/exec';
import executor from './executor';

import type { GithubExecutorSchema } from './schema';
import { logger } from '@nrwl/devkit';

jest.mock('../utils/exec');

const options: GithubExecutorSchema = {
  tag: 'v1.0.0'
};

describe('Github Executor', () => {
  const mockExec = exec as jest.Mock;

  beforeEach(() => {
    mockExec.mockImplementation(() => of({ stdout: 'success' }));
  });

  afterEach(() => {
    mockExec.mockReset();
  });

  it('should create release', async () => {
    const output = await executor(options);

    expect(mockExec).toBeCalledWith('gh', expect.arrayContaining(['release', 'create', 'v1.0.0']));
    expect(output.success).toBe(true);
  });

  it('should create release by specifying --files', async () => {
    const output = await executor({ ...options, files: ['./dist/package'] });

    expect(mockExec).toBeCalledWith('gh', expect.arrayContaining(['./dist/package']));
    expect(output.success).toBe(true);
  });

  it('should create release by specifying --target', async () => {
    const output = await executor({ ...options, target: 'master' });

    expect(mockExec).toBeCalledWith('gh', expect.arrayContaining(['--target', 'master']));
    expect(output.success).toBe(true);
  });

  it('should create release by specifying --notes', async () => {
    const output = await executor({ ...options, notes: 'add feature' });

    expect(mockExec).toBeCalledWith('gh', expect.arrayContaining(['--notes', 'add feature']));
    expect(output.success).toBe(true);
  });

  it('should create release by specifying --notesFile', async () => {
    const output = await executor({ ...options, notesFile: 'libs/my-lib/CHANGELOG.md' });

    expect(mockExec).toBeCalledWith('gh', expect.arrayContaining(['--notes-file', 'libs/my-lib/CHANGELOG.md']));
    expect(output.success).toBe(true);
  });

  it('should create release by specifying --draft', async () => {
    const output = await executor({ ...options, draft: true });

    expect(mockExec).toBeCalledWith('gh', expect.arrayContaining(['--draft']));
    expect(output.success).toBe(true);
  });

  it('should create release by specifying --title', async () => {
    const output = await executor({ ...options, title: 'Title for release' });

    expect(mockExec).toBeCalledWith('gh', expect.arrayContaining(['--title', 'Title for release']));
    expect(output.success).toBe(true);
  });

  it('should create release by specifying --prerelease', async () => {
    const output = await executor({ ...options, prerelease: true });

    expect(mockExec).toBeCalledWith('gh', expect.arrayContaining(['--prerelease']));
    expect(output.success).toBe(true);
  });

  it('should create release by specifying --discussionCategory', async () => {
    const output = await executor({ ...options, discussionCategory: 'General' });

    expect(mockExec).toBeCalledWith('gh', expect.arrayContaining(['--discussion-category', 'General']));
    expect(output.success).toBe(true);
  });

  it('should create release by specifying --repo', async () => {
    const output = await executor({ ...options, repo: 'repo:MYORG/REPO' });

    expect(mockExec).toBeCalledWith('gh', expect.arrayContaining(['--repo', 'repo:MYORG/REPO']));
    expect(output.success).toBe(true);
  });

  it('should create release by specifying --generateNotes', async () => {
    const output = await executor({ ...options, generateNotes: true });

    expect(mockExec).toBeCalledWith('gh', expect.arrayContaining(['--generate-notes']));
    expect(output.success).toBe(true);
  });

  it('should create release by specifying --notesStartTag', async () => {
    const output = await executor({ ...options, notesStartTag: 'v1.0.0' });

    expect(mockExec).toBeCalledWith('gh', expect.arrayContaining(['--notes-start-tag']));
    expect(output.success).toBe(true);
  });

  it('should create release by specifying --verifyTag', async () => {
    const output = await executor({ ...options, verifyTag: true });

    expect(mockExec).toBeCalledWith('gh', expect.arrayContaining(['--verify-tag']));
    expect(output.success).toBe(true);
  });

  it('should create release by specifying --latest', async () => {
    const output = await executor({ ...options, latest: true });

    expect(mockExec).toBeCalledWith('gh', expect.arrayContaining(['--latest']));
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
    it('should upload all tarballs in a directory as release assets', async () => {
      const output = await executor({
        ...options,
        assets: ['./dist/*.tgz']
      });

      expect(mockExec).toBeCalledWith('gh', expect.arrayContaining(['./dist/*.tgz']));
      expect(output.success).toBe(true);
    });

    it('should upload a release asset', async () => {
      const output = await executor({
        ...options,
        assets: ['/path/to/asset1.zip', { path: '/path/to/asset2.zip' }]
      });

      expect(mockExec).toBeCalledWith('gh', expect.arrayContaining(['/path/to/asset1.zip', '/path/to/asset2.zip']));
      expect(output.success).toBe(true);
    });

    it('should upload a release asset with display label', async () => {
      const output = await executor({
        ...options,
        assets: ['/path/to/asset1.zip#Asset1', { path: '/path/to/asset2.zip', name: 'Asset2' }]
      });

      expect(mockExec).toBeCalledWith(
        'gh',
        expect.arrayContaining(['/path/to/asset1.zip#Asset1', '/path/to/asset2.zip#Asset2'])
      );
      expect(output.success).toBe(true);
    });
  });
});
