import type { Config } from '@types/conventional-changelog-config-spec';

export interface InstallGeneratorSchema {
  independent: boolean;
  baseBranch?: string;
  projects?: string[];
  commitMessageFormat?: string;
  enforceConventionalCommits?: boolean;
  changelogPreset?: 'angular' | 'conventionalcommits' | ({ name: string } & Config);
  createRelease?: 'github' | 'gitlab';
  publish?: boolean;
  skipInstall?: boolean;
}
