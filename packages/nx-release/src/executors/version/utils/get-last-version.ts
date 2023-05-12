import gitSemverTags, { type Options } from 'git-semver-tags';
import { from, of, switchMap, type Observable } from 'rxjs';
import semver from 'semver';
import { promisify } from 'util';

/**
 * Get the last version
 *
 * @param param.tagPrefix
 * @param param.includePrerelease
 * @param param.preid
 * @returns
 */
export function getLastVersion({
  tagPrefix,
  includePrerelease = true,
  preid
}: {
  tagPrefix: string;
  includePrerelease?: boolean;
  preid?: string;
}): Observable<string> {
  return from(promisify<Options, string[]>(gitSemverTags)({ tagPrefix })).pipe(
    switchMap(tags => {
      const versions = tags
        .map(tag => tag.substring(tagPrefix.length))
        .filter(v => {
          const prerelease = semver.prerelease(v);

          // Filter-in everything except prerelease
          if (prerelease == null) {
            return true;
          }

          if (includePrerelease) {
            // Filter-in everything if preid is not set
            if (preid == null) {
              return true;
            }

            // Filter-in if preids match
            const [versionPreid] = prerelease;
            if (versionPreid === preid) {
              return true;
            }
          }

          // Filter-out everything else
          return false;
        });

      const [version] = versions.sort(semver.rcompare);

      if (version == null) {
        throw new Error('No semver tag found');
      }

      return of(version);
    })
  );
}
