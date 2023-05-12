export interface GithubExecutorSchema {
  tag: string;
  target?: string;
  files?: string[];
  notes?: string;
  notesFile?: string;
  draft?: boolean;
  title?: string;
  prerelease?: boolean;
  discussionCategory?: string;
  repo?: string;
  generateNotes?: boolean;
  notesStartTag?: string;
  verifyTag?: boolean;
  latest?: boolean;
  assets?: Array<string | GithubAsset>;
}

export interface GithubAsset {
  path: string;
  name?: string;
}
