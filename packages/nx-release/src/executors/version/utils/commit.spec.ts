import { lastValueFrom, of } from 'rxjs';

import { commit, formatCommitMessage } from './commit';
import * as cp from '../../utils/exec';

jest.mock('../../utils/exec');

jest.spyOn(console, 'log').mockImplementation();

describe('formatCommitMessage', () => {
  it('should format commit message with projectName and version', () => {
    expect(
      formatCommitMessage({
        commitMessageFormat: 'chore(${projectName}): release ${version}',
        version: 'v1.0.0',
        projectName: 'a'
      })
    ).toBe('chore(a): release v1.0.0');
  });
});

describe('commit', () => {
  afterEach(() => {
    (cp.exec as jest.Mock).mockReset();
  });

  beforeEach(() => {
    jest.spyOn(cp, 'exec').mockReturnValue(of('success'));
  });

  it('should commit', async () => {
    await lastValueFrom(
      commit({
        dryRun: false,
        noVerify: false,
        skipCommit: false,
        commitMessage: 'chore(release): 1.0.0',
        projectName: 'p'
      })
    );

    expect(cp.exec).toBeCalledWith('git', expect.arrayContaining(['commit', '-m', 'chore(release): 1.0.0']));
  });

  it('should skip commit with --dryRun', done => {
    commit({
      dryRun: true,
      noVerify: false,
      skipCommit: false,
      commitMessage: 'chore(release): 1.0.0',
      projectName: 'p'
    }).subscribe({
      complete() {
        expect(cp.exec).not.toBeCalled();
        done();
      }
    });
  });

  it('should skip commit with --skipCommit but do not complete the stream', done => {
    commit({
      dryRun: false,
      noVerify: false,
      skipCommit: true,
      commitMessage: 'chore(release): 1.0.0',
      projectName: 'p'
    }).subscribe({
      next() {
        expect(cp.exec).not.toBeCalled();
        done();
      }
    });
  });

  it('should pass --no-verify', async () => {
    await lastValueFrom(
      commit({
        dryRun: false,
        noVerify: true,
        skipCommit: false,
        commitMessage: 'chore(release): 1.0.0',
        projectName: 'p'
      })
    );

    expect(cp.exec).toBeCalledWith('git', expect.arrayContaining(['--no-verify']));
  });

  it('should commit with --amend', async () => {
    await lastValueFrom(
      commit({
        dryRun: false,
        noVerify: false,
        skipCommit: false,
        commitMessage: 'chore(release): 1.0.0',
        projectName: 'p',
        amend: true
      })
    );

    expect(cp.exec).toBeCalledWith('git', expect.arrayContaining(['commit', '--amend', '--no-edit']));
  });
});
