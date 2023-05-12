import gitRawCommits from 'git-raw-commits';
import { PassThrough } from 'stream';
import { lastValueFrom, of, throwError } from 'rxjs';

import { addToStage, createTag, getCommits, getFirstCommitRef, tryPush } from './git';
import * as cp from '../../utils/exec';

jest.mock('git-raw-commits', () => jest.fn());
jest.mock('../../utils/exec');

describe('git', () => {
  jest.spyOn(console, 'log').mockImplementation();
  jest.spyOn(console, 'warn').mockImplementation();

  afterEach(() => {
    (cp.exec as jest.Mock).mockReset();
  });

  describe('getCommits', () => {
    const mockGitRawCommits = gitRawCommits as jest.Mock;

    it('should get commits list', () => {
      const stream = new PassThrough();
      mockGitRawCommits.mockReturnValue(stream);

      const observer = {
        next: jest.fn(),
        complete: jest.fn()
      };

      getCommits({
        projectRoot: 'libs/demo',
        since: 'x1.0.0'
      }).subscribe(observer);

      stream.emit('data', 'feat A');
      stream.emit('data', 'feat B');
      stream.emit('close');

      expect(observer.next).toBeCalledTimes(1);
      expect(observer.next).toBeCalledWith(['feat A', 'feat B']);
      expect(observer.complete).toBeCalledTimes(1);
    });
  });

  describe('tryPush', () => {
    it('should Git push with right options', async () => {
      jest.spyOn(cp, 'exec').mockReturnValue(of('success'));

      await lastValueFrom(
        tryPush({
          tag: 'v1.0.0',
          remote: 'upstream',
          branch: 'master',
          noVerify: false,
          projectName: 'p'
        })
      );

      expect(cp.exec).toBeCalledWith(
        'git',
        expect.arrayContaining(['push', '--atomic', 'upstream', 'master', 'v1.0.0'])
      );
    });

    it('should Git push and add `--no-verify` options when asked', async () => {
      jest.spyOn(cp, 'exec').mockReturnValue(of('success'));

      await lastValueFrom(
        tryPush({
          tag: 'v1.0.0',
          remote: 'origin',
          branch: 'main',
          noVerify: true,
          projectName: 'p'
        })
      );

      expect(cp.exec).toBeCalledWith(
        'git',
        expect.arrayContaining(['push', '--no-verify', '--atomic', 'origin', 'main', 'v1.0.0'])
      );
    });

    it('should retry Git push if `--atomic` option not supported', async () => {
      jest
        .spyOn(cp, 'exec')
        .mockReturnValueOnce(throwError(() => new Error('atomic failed')))
        .mockReturnValueOnce(of('success'));

      await lastValueFrom(
        tryPush({
          tag: 'v1.0.0',
          remote: 'origin',
          branch: 'master',
          noVerify: false,
          projectName: 'p'
        })
      );

      expect(cp.exec).toHaveBeenNthCalledWith(
        1,
        'git',
        expect.arrayContaining(['push', '--atomic', 'origin', 'master', 'v1.0.0'])
      );
      expect(cp.exec).toHaveBeenNthCalledWith(2, 'git', expect.not.arrayContaining(['--atomic']));
      expect(console.warn).toBeCalled();
    });

    it('should throw if Git push failed', async () => {
      jest.spyOn(cp, 'exec').mockReturnValue(throwError(() => new Error('Something went wrong')));

      await expect(
        lastValueFrom(
          tryPush({
            tag: 'v1.0.0',
            remote: 'origin',
            branch: 'master',
            noVerify: false,
            projectName: 'p'
          })
        )
      ).rejects.toEqual(new Error('Something went wrong'));
      expect(cp.exec).toBeCalledTimes(1);
    });

    it('should fail if options are undefined', async () => {
      await expect(
        lastValueFrom(
          tryPush({
            tag: 'v1.0.0',
            remote: undefined as never,
            branch: undefined as never,
            noVerify: false,
            projectName: 'p'
          })
        )
      ).rejects.toEqual(expect.any(Error));
    });
  });

  describe('addToStage', () => {
    it('should add to git stage', async () => {
      jest.spyOn(cp, 'exec').mockReturnValue(of('ok'));

      await lastValueFrom(
        addToStage({
          paths: ['packages/demo/file.txt', 'packages/demo/other-file.ts'],
          dryRun: false
        })
      );

      expect(cp.exec).toBeCalledWith(
        'git',
        expect.arrayContaining(['add', 'packages/demo/file.txt', 'packages/demo/other-file.ts'])
      );
    });

    it('should skip git add if paths argument is empty', async () => {
      jest.spyOn(cp, 'exec').mockReturnValue(of('ok'));

      await lastValueFrom(
        addToStage({
          paths: [],
          dryRun: false
        }),
        { defaultValue: undefined }
      );

      expect(cp.exec).not.toBeCalled();
    });
  });

  describe('getFirstCommitRef', () => {
    it('should get last git commit', async () => {
      jest.spyOn(cp, 'exec').mockReturnValue(of('sha1\n'));

      const tag = await lastValueFrom(getFirstCommitRef());

      expect(tag).toBe('sha1');
      expect(cp.exec).toBeCalledWith('git', expect.arrayContaining(['rev-list', '--max-parents=0', 'HEAD']));
    });

    it('should get last listed git commit when multiple unrelated histories origins exist', async () => {
      jest.spyOn(cp, 'exec').mockReturnValue(of('sha1\nsha2\nsha3\n\r\n'));

      const tag = await lastValueFrom(getFirstCommitRef());

      expect(tag).toBe('sha3');
      expect(cp.exec).toBeCalledWith('git', expect.arrayContaining(['rev-list', '--max-parents=0', 'HEAD']));
    });
  });

  describe('createTag', () => {
    it('should create git tag', async () => {
      jest.spyOn(cp, 'exec').mockReturnValue(of('success'));

      const tag = await lastValueFrom(
        createTag({
          dryRun: false,
          skipTag: false,
          commitHash: '123',
          tag: 'project-a-1.0.0',
          commitMessage: 'chore(release): 1.0.0',
          projectName: 'p'
        })
      );

      expect(tag).toBe('project-a-1.0.0');
      expect(cp.exec).toBeCalledWith(
        'git',
        expect.arrayContaining(['tag', '-a', 'project-a-1.0.0', '123', '-m', 'chore(release): 1.0.0'])
      );
    });

    it('should create git tag', async () => {
      jest.spyOn(cp, 'exec').mockReturnValue(of('success'));

      const tag = await lastValueFrom(
        createTag({
          dryRun: false,
          skipTag: false,
          commitHash: '123',
          tag: 'project-a-1.0.0',
          commitMessage: 'chore(release): 1.0.0',
          projectName: 'p'
        })
      );

      expect(tag).toBe('project-a-1.0.0');
      expect(cp.exec).toBeCalledWith(
        'git',
        expect.arrayContaining(['tag', '-a', 'project-a-1.0.0', '123', '-m', 'chore(release): 1.0.0'])
      );
    });

    it('should skip with --dryRun', done => {
      createTag({
        dryRun: true,
        skipTag: false,
        tag: 'project-a-1.0.0',
        commitHash: '123',
        commitMessage: 'chore(release): 1.0.0',
        projectName: 'p'
      }).subscribe({
        complete() {
          expect(cp.exec).not.toBeCalled();
          done();
        }
      });
    });

    it('should skip with --skipTag', done => {
      createTag({
        dryRun: false,
        skipTag: true,
        tag: 'project-a-1.0.0',
        commitHash: '123',
        commitMessage: 'chore(release): 1.0.0',
        projectName: 'p'
      }).subscribe({
        complete() {
          expect(cp.exec).not.toBeCalled();
          done();
        }
      });
    });

    it('should handle tag already exists error', done => {
      jest
        .spyOn(cp, 'exec')
        .mockReturnValue(throwError(() => new Error("fatal: tag 'project-a-1.0.0' already exists")));

      createTag({
        dryRun: false,
        skipTag: false,
        tag: 'project-a-1.0.0',
        commitHash: '123',
        commitMessage: 'chore(release): 1.0.0',
        projectName: 'p'
      }).subscribe({
        next: done.fail,
        complete: () => expect.fail('should not complete'),
        error(error) {
          expect(cp.exec).toBeCalled();
          expect(error.message).toMatch('Failed to tag "project-a-1.0.0", this tag already exists.');
          done();
        }
      });
    });

    describe('--tagCommand', () => {
      it('should exec custom git tag command', async () => {
        jest.spyOn(cp, 'exec').mockReturnValue(of('success'));

        await lastValueFrom(
          createTag({
            dryRun: false,
            skipTag: false,
            commitHash: '123',
            tag: 'project-a-1.0.0',
            tagCommand: 'git tag ${tag}',
            commitMessage: 'chore(release): 1.0.0',
            projectName: 'p'
          })
        );

        expect(cp.exec).toBeCalledWith('git', expect.arrayContaining(['tag', 'project-a-1.0.0']));
      });

      it('should handle not a git command error', done => {
        jest
          .spyOn(cp, 'exec')
          .mockReturnValue(throwError(() => new Error("git: 'gh-tag' is not a git command. See 'git --help'.")));

        createTag({
          dryRun: false,
          skipTag: false,
          commitHash: '123',
          tag: 'project-a-1.0.0',
          tagCommand: 'git gh-tag ${tag} -m ${message}',
          commitMessage: 'chore(release): 1.0.0',
          projectName: 'p'
        }).subscribe({
          next: done.fail,
          complete: () => expect.fail('should not complete'),
          error(error) {
            expect(cp.exec).toBeCalled();
            expect(cp.exec).toBeCalledWith(
              'git',
              expect.arrayContaining(['gh-tag', 'project-a-1.0.0', '-m', 'chore(release): 1.0.0'])
            );
            expect(error.message).toMatch('Failed to execute the git tag command, this command is not a git command.');
            done();
          }
        });
      });
    });
  });
});
