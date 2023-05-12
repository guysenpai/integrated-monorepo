import fs from 'fs';
import { lastValueFrom, of } from 'rxjs';
import { exec } from '../../utils/exec';
import { publish } from './publish';

import type { NpmOptions } from '../schema';

jest.mock('../utils/exec');

const options: { distPath: string; version?: string } & NpmOptions = {
  distPath: '/root/dist/test'
};

describe('publishPackage', () => {
  const mockExec = exec as jest.Mock;

  beforeEach(() => {
    mockExec.mockImplementation(() => of({ stdout: 'success' }));
  });

  afterEach(() => {
    mockExec.mockReset();
  });

  it('should publish package', async () => {
    await lastValueFrom(publish(options));

    expect(mockExec).toBeCalledWith('npm', expect.arrayContaining(['publish', '/root/dist/test']));
  });

  it('should publish package with specified --tag', async () => {
    await lastValueFrom(publish({ ...options, tag: 'latest' }));

    expect(mockExec).toBeCalledWith('npm', expect.arrayContaining(['--tag', 'latest']));
  });

  it('should publish package with specified --access', async () => {
    await lastValueFrom(publish({ ...options, access: 'public' }));

    expect(mockExec).toBeCalledWith('npm', expect.arrayContaining(['--access', 'public']));
  });

  it('should publish package with specified --registry', async () => {
    await lastValueFrom(publish({ ...options, registry: 'https://registry.npmjs.org' }));

    expect(mockExec).toBeCalledWith('npm', expect.arrayContaining(['--registry', 'https://registry.npmjs.org']));
  });

  it('should publish package with specified --otp', async () => {
    await lastValueFrom(publish({ ...options, otp: '12345' }));

    expect(mockExec).toBeCalledWith('npm', expect.arrayContaining(['--otp', '12345']));
  });

  it('should publish package with specified --dryRun', async () => {
    await lastValueFrom(publish({ ...options, dryRun: true }));

    expect(mockExec).toBeCalledWith('npm', expect.arrayContaining(['--dry-run']));
  });

  it('should set dist package version with specified --version', async () => {
    jest.spyOn(fs, 'readFileSync').mockReturnValue('{"version":"1.0.0"}');
    jest.spyOn(fs, 'writeFileSync').mockImplementation();

    await lastValueFrom(publish({ ...options, version: '1.1.0-rc.0' }));

    expect(fs.readFileSync).toBeCalledTimes(1);
    expect(fs.readFileSync).toBeCalledWith(
      '/root/dist/test/package.json',
      expect.objectContaining({ encoding: 'utf-8' })
    );
    expect(fs.writeFileSync).toBeCalledTimes(1);
    expect(fs.writeFileSync).toBeCalledWith(
      '/root/dist/test/package.json',
      expect.stringContaining(JSON.stringify({ version: '1.1.0-rc.0' }, null, 2)),
      expect.objectContaining({ encoding: 'utf-8' })
    );
  });

  it('should handle error with specified --version', async () => {
    jest.spyOn(fs, 'readFileSync').mockImplementation(() => {
      throw new Error('Failed to read');
    });
    jest.spyOn(fs, 'writeFileSync').mockImplementation();

    await expect(lastValueFrom(publish({ ...options, version: '1.1.0-rc.0' }))).rejects.toThrowError(
      'Error reading package.json file from library build output.'
    );
  });
});
