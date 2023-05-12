import { logger } from '@nrwl/devkit';
import conventionalChangelog from 'conventional-changelog';
import fs from 'fs';
import { Readable } from 'stream';

import type { ChangelogPreset } from '../schema';
import { writeChangelog } from './write-changelog';

jest.mock('conventional-changelog');

const mockConventionalChangelog = conventionalChangelog as jest.MockedFunction<typeof conventionalChangelog>;
const config = {
  changelogHeader: '# Changelog',
  changelogPreset: 'angular' as ChangelogPreset,
  changelogPath: 'CHANGELOG.md',
  projectRoot: './',
  tagPrefix: 'v',
  dryRun: false
};

describe('writeChangelog', () => {
  beforeAll(() => {
    jest.spyOn(logger, 'warn').mockImplementation();
    jest.spyOn(logger, 'info').mockImplementation();
    jest.spyOn(fs, 'writeFileSync').mockImplementation();
  });

  afterAll(() => {
    (logger.warn as jest.Mock).mockRestore();
    (logger.info as jest.Mock).mockRestore();
    (fs.writeFileSync as jest.Mock).mockRestore();
    mockConventionalChangelog.mockRestore();
  });

  describe('handle buildConventionalChangelog error', () => {
    beforeAll(async () => {
      mockConventionalChangelog.mockReturnValue(
        new Readable({
          read() {
            this.emit('error', ':boom:');
          }
        })
      );
      await writeChangelog({ ...config, newVersion: '0.0.1' });
    });

    afterAll(() => {
      (logger.warn as jest.Mock).mockClear();
      (logger.info as jest.Mock).mockClear();
    });

    it('should print a logger.warn', async () => {
      expect(logger.warn).toBeCalledWith('Changelog creation failed :boom:');
    });

    it('should not write a changelog file', async () => {
      expect(fs.writeFileSync).not.toBeCalled();
    });
  });

  describe('--dryRun', () => {
    const version = '0.0.1-rc.1';

    beforeAll(async () => {
      mockConventionalChangelog.mockImplementation(jest.requireActual('conventional-changelog'));

      await writeChangelog({ ...config, dryRun: true, newVersion: version });
    });

    afterAll(() => {
      (logger.warn as jest.Mock).mockClear();
      (logger.info as jest.Mock).mockClear();
    });

    it('should not write a changelog file', async () => {
      expect(fs.writeFileSync).not.toBeCalled();
    });

    it('should print a logger.info with changelog contents without the header', async () => {
      expect(logger.info).toBeCalledWith(expect.stringContaining(`## ${version}`));
      expect(logger.info).toBeCalledWith(expect.not.stringContaining(config.changelogHeader));
    });
  });
});
