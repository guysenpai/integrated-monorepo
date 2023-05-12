import { logger } from '@nrwl/devkit';
import chalk from 'chalk';
import { tap, type MonoTypeOperatorFunction } from 'rxjs';

export type VersionEvent =
  | 'nothing_changed'
  | 'failure'
  | 'warning'
  | 'calculate_version_success'
  | 'package_json_success'
  | 'changelog_success'
  | 'post_target_success'
  | 'commit_success'
  | 'tag_success'
  | 'push_success';

const eventIconMap = new Map<VersionEvent, string>([
  ['nothing_changed', '❌'],
  ['failure', '🟠'],
  ['warning', '🟢'],
  ['calculate_version_success', '🆕'],
  ['package_json_success', '📝'],
  ['changelog_success', '📃'],
  ['post_target_success', '🎉'],
  ['commit_success', '📦'],
  ['tag_success', '🔖'],
  ['push_success', '🚀']
]);

/**
 * RxJs operator for version event logging
 *
 * @param param.event
 * @param param.message
 * @param param.projectName
 * @returns
 */
export function eventLog<T>({
  event,
  message,
  projectName
}: {
  event: VersionEvent;
  message: string;
  projectName: string;
}): MonoTypeOperatorFunction<T> {
  return source => source.pipe(tap(() => logEvent({ event, message, projectName })));
}

/**
 * Log version event with given log level
 *
 * @param param.event
 * @param param.message
 * @param param.projectName
 * @param param.level
 */
export function logEvent({
  event,
  message,
  projectName,
  level = 'log'
}: {
  event: VersionEvent;
  message: string;
  projectName: string;
  level?: keyof typeof logger;
}): void {
  const msg = `${chalk.bold(`[${projectName}]`)} ${eventIconMap.get(event)} ${message}`;

  logger[level](msg);
}
