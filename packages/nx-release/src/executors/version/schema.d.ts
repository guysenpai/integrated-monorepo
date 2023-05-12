import type { Config } from '@types/conventional-changelog-config-spec';
import type { ReleaseType } from 'semver';

export type ChangelogPreset = 'angular' | 'conventionalcommits' | ({ name: string } & Config);

export interface VersionExecutorSchema {
  independent?: boolean;
  baseBranch?: string;
  commitMessageFormat?: string;
  changelogHeader?: string;
  changelogPreset?: ChangelogPreset;
  releaseType?: ReleaseType;
  allowEmptyRelease?: boolean;
  tagCommand?: string;
  remote?: string;
  amend?: boolean;
  preid?: string;
  push?: boolean;
  trackDeps?: boolean;
  postTargets?: string[];
  tagPrefix?: string;
  skipRootChangelog?: boolean;
  skipProjectChangelog?: boolean;
  skipCommit?: boolean;
  skipCommitTypes?: string[];
  skipTag?: boolean;
  skipPrivate?: boolean;
  noVerify?: boolean;
  dryRun?: boolean;
}
