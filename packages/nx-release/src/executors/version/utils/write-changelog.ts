import { logger } from '@nrwl/devkit';
import chalk from 'chalk';
import conventionalChangelog, { type Options } from 'conventional-changelog';
import { accessSync, constants, readFileSync, writeFileSync } from 'fs';

import type { Readable } from 'stream';
import type { ChangelogPreset } from '../schema';

const START_OF_LAST_RELEASE_PATTERN = /(^#+ \[?[0-9]+\.[0-9]+\.[0-9]+|<a name=)/m;

/**
 * Write changelog content to the file
 *
 * @param param.changelogHeader
 * @param param.changelogPreset
 * @param param.changelogPath
 * @param param.projectRoot
 * @param param.newVersion
 * @param param.tagPrefix
 * @param param.dryRun
 * @returns
 */
export function writeChangelog({
  dryRun,
  changelogHeader,
  changelogPreset,
  changelogPath,
  tagPrefix,
  projectRoot,
  newVersion
}: {
  dryRun: boolean;
  changelogHeader: string;
  changelogPreset: ChangelogPreset;
  changelogPath: string;
  tagPrefix: string;
  projectRoot: string;
  newVersion: string;
}): Promise<void> {
  return _buildConventionalChangelog({
    changelogPreset,
    tagPrefix,
    projectRoot,
    newVersion
  })
    .then(newContent => {
      if (dryRun) {
        return logger.info(`\n---\n${chalk.gray(newContent.trim())}\n---\n`);
      }

      try {
        accessSync(changelogPath, constants.F_OK);
      } catch (error) {
        if (error.code === 'ENOENT') {
          writeFileSync(changelogPath, '\n', 'utf-8');
        }
      }

      return writeFileSync(
        changelogPath,
        changelogHeader + '\n' + (newContent + _buildExistingContent(changelogPath)).replace(/\n+$/, '\n'),
        'utf-8'
      );
    })
    .catch(err => {
      logger.warn(`Changelog creation failed ${err.toString()}`);

      return err;
    });
}

/**
 * Return the existing content from the changelog path
 *
 * @param changelogPath
 * @returns
 * @private
 */
function _buildExistingContent(changelogPath: string): string {
  const existingContent = readFileSync(changelogPath, 'utf-8');
  const existingContentStart = existingContent.search(START_OF_LAST_RELEASE_PATTERN);

  // Find the position of the last release and remove header
  if (existingContentStart !== -1) {
    return existingContent.substring(existingContentStart);
  }

  return existingContent;
}

/**
 * Build conventional changelog
 *
 * @param param.changelogPreset
 * @param param.tagPrefix
 * @param param.projectRoot
 * @param param.newVersion
 * @returns
 * @private
 */
function _buildConventionalChangelog({
  changelogPreset,
  tagPrefix,
  projectRoot,
  newVersion
}: {
  changelogPreset: ChangelogPreset;
  tagPrefix: string;
  projectRoot: string;
  newVersion: string;
}): Promise<string> {
  return new Promise((resolve, reject) => {
    let changelog = '';
    const changelogStream = _initConventionalCommitReadableStream({
      changelogPreset,
      tagPrefix,
      projectRoot,
      newVersion
    });

    changelogStream.on('error', err => {
      reject(err);
    });

    changelogStream.on('data', (buffer: ArrayBuffer) => {
      changelog += buffer.toString();
    });

    changelogStream.on('end', () => {
      resolve(changelog);
    });

    return;
  });
}

/**
 * Returns the conventional changelog readable stream
 *
 * @param param.changelogPreset
 * @param param.tagPrefix
 * @param param.projectRoot
 * @param param.newVersion
 * @returns
 * @private
 */
function _initConventionalCommitReadableStream({
  changelogPreset,
  tagPrefix,
  projectRoot,
  newVersion
}: {
  changelogPreset: ChangelogPreset;
  tagPrefix: string;
  projectRoot: string;
  newVersion: string;
}): Readable {
  const context = { version: newVersion };

  return conventionalChangelog(
    {
      preset: changelogPreset as string,
      tagPrefix: tagPrefix
    },
    context,
    { merges: null, path: projectRoot } as Options
  );
}
