export interface NpmExecutorSchema {
  distFolderPath?: string;
  buildTarget?: string;
  noBuild?: boolean;
  version?: string;
  tag?: string;
  access?: 'public' | 'restricted';
  otp?: string;
  registry?: string;
  dryRun?: boolean;
}

export interface NpmOptions {
  tag?: string;
  access?: 'public' | 'restricted';
  otp?: string;
  registry?: string;
  dryRun?: boolean;
}

export interface BuildOptions {
  outputPath?: string;
  project?: string;
}
