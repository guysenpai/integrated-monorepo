import { createTemplateString } from './template-string';

/**
 * Format tag prefix
 *
 * @param param.tagVersionPrefix
 * @param param.projectName
 * @param param.syncVersions
 * @returns
 */
export function formatTagPrefix({
  tagVersionPrefix,
  projectName,
  syncVersions
}: {
  tagVersionPrefix?: string | null;
  projectName: string;
  syncVersions: boolean;
}): string {
  if (tagVersionPrefix != null) {
    return createTemplateString(tagVersionPrefix, {
      target: projectName,
      projectName: projectName
    });
  }

  if (syncVersions) {
    return 'v';
  }

  return `${projectName}@`;
}

/**
 * Format tag
 *
 * @param param.tagPrefix
 * @param param.version
 * @returns
 */
export function formatTag({ tagPrefix, version }: { tagPrefix: string; version: string }): string {
  return `${tagPrefix}${version}`;
}
