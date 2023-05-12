export interface GitlabExecutorSchema {
  tag: string;
  ref?: string;
  assets?: Array<string | GitlabAsset>;
  name?: string;
  notes?: string;
  notesFile?: string;
  milestones?: string[];
  releasedAt?: string;
  repo?: string;
}

export interface GitlabAsset {
  url: string;
  name?: string;
  type?: 'other' | 'runbook' | 'image' | 'package';
  filepath?: string;
}
