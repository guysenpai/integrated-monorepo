import { createTemplateString } from './template-string';

/**
 * Format tag prefix
 *
 * @param param.tagVersionPrefix
 * @param param.projectName
 * @param param.independent
 * @returns
 */
export function formatTagPrefix({
  tagVersionPrefix,
  projectName,
  independent
}: {
  tagVersionPrefix?: string | null;
  projectName: string;
  independent: boolean;
}): string {
  if (tagVersionPrefix != null) {
    return createTemplateString(tagVersionPrefix, {
      target: projectName,
      projectName: projectName
    });
  }

  if (!independent) {
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
