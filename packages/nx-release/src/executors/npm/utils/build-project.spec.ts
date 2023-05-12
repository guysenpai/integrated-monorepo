import { runExecutor } from '@nrwl/devkit';
import { createTestingContext } from '../../utils/testing';
import { buildProject } from './build-project';
import { lastValueFrom } from 'rxjs';

jest.mock('@nrwl/devkit', () => ({
  runExecutor: jest.fn(),
  parseTargetString: jest.requireActual('@nrwl/devkit').parseTargetString,
  logger: {
    info: jest.fn()
  }
}));

describe('buildProject', () => {
  const mockRunExecutor = runExecutor as jest.Mock;
  let nextSpy: jest.Mock;

  const context = createTestingContext({
    project: 'test',
    projectRoot: 'libs/test',
    workspaceRoot: '/root',
    projectGraph: { nodes: {}, dependencies: {} }
  });
  const options = {
    context,
    buildTarget: 'build',
    noBuild: false
  };

  beforeEach(() => {
    nextSpy = jest.fn();
    mockRunExecutor.mockImplementation(function* () {
      yield { success: true };
    });
    context.target = { executor: 'build' };
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should successfully execute build target', done => {
    buildProject(options).subscribe({
      next: nextSpy,
      complete() {
        expect(nextSpy).toBeCalledTimes(1);
        expect(mockRunExecutor).toBeCalledTimes(1);
        expect(mockRunExecutor.mock.calls[0][0]).toEqual(
          expect.objectContaining({
            project: 'test',
            target: 'build'
          })
        );
        done();
      }
    });
  });

  it('should return target description', async () => {
    const target = await lastValueFrom(buildProject(options));

    expect(target).toEqual(
      expect.objectContaining({
        project: 'test',
        target: 'build'
      })
    );
  });

  it('should not execute build target when context target does not exit', done => {
    context.target = undefined;

    buildProject(options).subscribe({
      next: nextSpy,
      error(error) {
        expect(nextSpy).not.toBeCalled();
        expect(mockRunExecutor).not.toBeCalled();
        expect(error.toString()).toEqual('Error: Cannot execute the build target.');
        done();
      }
    });
  });

  it('should not execute build target when context target does not exit', done => {
    mockRunExecutor.mockImplementation(function* () {
      yield new Error('Nop!');
    });

    buildProject(options).subscribe({
      next: nextSpy,
      error(error) {
        expect(nextSpy).not.toBeCalled();
        expect(mockRunExecutor).toBeCalledTimes(1);
        expect(error.toString()).toEqual('Error: Could not build "test".');
        done();
      }
    });
  });
});
