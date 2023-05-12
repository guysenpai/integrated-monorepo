import { promises } from 'fs';
import { lastValueFrom } from 'rxjs';

import { readFileIfExist, readJsonFile } from './filesystem';

jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn().mockResolvedValue(() => Promise.resolve()),
    access: jest.fn().mockResolvedValue(() => Promise.resolve())
  }
}));

describe('readJsonFile', () => {
  const mockReadFile = promises.readFile as jest.Mock;

  afterEach(() => {
    mockReadFile.mockReset();
  });

  it('should emit error', async () => {
    mockReadFile.mockRejectedValue(new Error('ENOENT: no such file or directory'));

    const file$ = readJsonFile('/unexisting-file');

    await new Promise(setImmediate);

    await expect(lastValueFrom(file$)).rejects.toThrow('ENOENT: no such file or directory');
    expect(mockReadFile).toBeCalledTimes(1);
  });
});

describe('readFileIfExists', () => {
  const mockReadFile = promises.readFile as jest.Mock;
  const mockAccess = promises.access as jest.Mock;

  afterEach(() => {
    mockReadFile.mockReset();
    mockAccess.mockReset();
  });

  it('should return an empty string if the file does not exists', async () => {
    mockAccess.mockResolvedValue(false);
    mockReadFile.mockRejectedValue(new Error('ENOENT: no such file or directory'));

    const file$ = readFileIfExist('/unexisting-file');

    await new Promise(setImmediate);

    expect(await lastValueFrom(file$)).toBe('');
  });

  it('should return a fallback value if provided', async () => {
    mockAccess.mockResolvedValue(false);
    mockReadFile.mockRejectedValue(new Error('ENOENT: no such file or directory'));

    const file$ = readFileIfExist('/unexisting-file', 'some fallback');

    await new Promise(setImmediate);

    expect(await lastValueFrom(file$)).toBe('some fallback');
  });
});
