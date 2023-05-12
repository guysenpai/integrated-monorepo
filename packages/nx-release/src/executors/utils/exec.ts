import { ChildProcess, execFile } from 'child_process';
import { Observable } from 'rxjs';

/**
 * Execute command with args
 *
 * @param cmd
 * @param args
 * @returns
 */
export function exec(cmd: string, args: string[] = []): Observable<string> {
  return new Observable(subscriber => {
    const process = execFile(cmd, args, (error, stdout, stderr) => {
      if (error) {
        subscriber.error(new Error(stderr));
        return;
      }

      subscriber.next(stdout);
      subscriber.complete();
    });

    const _removeEvents = _listenExitEvent(() => subscriber.complete());

    return () => {
      _killProcess(process);
      _removeEvents();
    };
  });
}

/**
 * Kill process
 *
 * @param process
 * @private
 */
function _killProcess(process: ChildProcess): void {
  if (process.stdout) {
    process.stdout.removeAllListeners();
  }

  if (process.stderr) {
    process.stderr.removeAllListeners();
  }

  process.removeAllListeners();
  process.kill('SIGKILL');
}

/**
 * Listen exit event
 *
 * @param fn
 * @param events
 * @private
 */
function _listenExitEvent(fn: (signal: number) => void, events: NodeJS.Signals[] = ['SIGINT', 'SIGBREAK']): () => void {
  events.forEach(eventName => process.on(eventName, fn));
  process.on('exit', fn);

  return () => {
    events.forEach(eventName => process.off(eventName, fn));
    process.off('exit', fn);
  };
}
