import { readTargetOptions } from '@nrwl/devkit';
import { promises } from 'fs';
import { lastValueFrom } from 'rxjs';

import { createTestingContext } from '../../utils/testing';
import { getDistPath } from './dist-path';

jest.mock('@nrwl/devkit', () => ({
  readTargetOptions: jest.fn(),
  joinPathFragments: jest.requireActual('@nrwl/devkit').joinPathFragments
}));

describe('getDistPath', () => {
  const mockReadTargetOptions = readTargetOptions as jest.Mock;
  let nextSpy: jest.Mock;

  const context = createTestingContext({
    project: 'test',
    projectRoot: 'libs/test',
    workspaceRoot: '/root',
    projectGraph: { nodes: {}, dependencies: {} }
  });
  const targetDescription = {
    project: 'test',
    target: 'build'
  };

  beforeEach(() => {
    nextSpy = jest.fn();
    mockReadTargetOptions.mockReturnValue({});
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should return dist path with given dist folder path', async () => {
    const distPath = await lastValueFrom(getDistPath({ targetDescription, distFolderPath: 'dist/test', context }));

    expect(distPath).toEqual('/root/dist/test');
  });

  it('should return dist path with build option `outputPath`', async () => {
    mockReadTargetOptions.mockReturnValue({ outputPath: 'dist/test' });

    const distPath = await lastValueFrom(getDistPath({ targetDescription, context }));

    expect(distPath).toEqual('/root/dist/test');
  });

  it('should return dist path with build option `project`', async () => {
    mockReadTargetOptions.mockReturnValue({ project: 'libs/test/ng-package.json' });
    jest.spyOn(promises, 'readFile').mockResolvedValue(`{"dest": "../../dist/test"}`);

    const distPath = await lastValueFrom(getDistPath({ targetDescription, context }));

    expect(distPath).toEqual('/root/dist/test');
  });

  it('should handle error reading ngPackage file with build option `project`', done => {
    mockReadTargetOptions.mockReturnValue({ project: 'libs/test/ng-package.json' });
    jest.spyOn(promises, 'readFile').mockRejectedValue(new Error('Failed reading ng-package.json'));

    getDistPath({ targetDescription, context }).subscribe({
      next: nextSpy,
      error(error) {
        expect(nextSpy).not.toBeCalled();
        expect(error.toString()).toEqual('Error: Failed to read the ng-package.json');
        done();
      }
    });
  });

  it('should handle error `dest` option does not exist with build option `project`', done => {
    mockReadTargetOptions.mockReturnValue({ project: 'libs/test/ng-package.json' });
    jest.spyOn(promises, 'readFile').mockResolvedValue(`{"lib": {"entryFile": "src/index.ts"}}`);

    getDistPath({ targetDescription, context }).subscribe({
      next: nextSpy,
      error(error) {
        expect(nextSpy).not.toBeCalled();
        expect(error.toString()).toEqual("Error: `dest` option does not exist or it's not a string");
        done();
      }
    });
  });

  it('should not detect dist path`', done => {
    mockReadTargetOptions.mockReturnValue(undefined);

    getDistPath({ targetDescription, context }).subscribe({
      next: nextSpy,
      error(error) {
        expect(nextSpy).not.toBeCalled();
        expect(error.toString()).toEqual("Error: Cannot find the library's dist path");
        done();
      }
    });
  });
});
