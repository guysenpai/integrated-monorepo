import { constants, promises } from 'fs';
import { catchError, defer, map, of, type Observable, switchMap } from 'rxjs';

/**
 * Check if the file path can be access in read or write mode
 *
 * @param filePath
 * @returns
 */
export function exists(filePath: string): Observable<boolean> {
  return defer(() => promises.access(filePath, constants.R_OK | constants.W_OK)).pipe(
    map(() => true),
    catchError(() => of(false))
  );
}

/**
 * Read the content of file
 *
 * @param filePath
 * @returns
 */
export function readFile(filePath: string): Observable<string> {
  return defer(() => promises.readFile(filePath, { encoding: 'utf-8' }));
}

/**
 * Read file content if file exist
 *
 * @param filePath
 * @param fallback
 * @returns
 */
export function readFileIfExist(filePath: string, fallback = ''): Observable<string> {
  return exists(filePath).pipe(switchMap(exist => (exist ? readFile(filePath) : of(fallback))));
}

/**
 * Read file content and parse to JSON
 *
 * @param filePath
 * @returns
 */
export function readJsonFile(filePath: string): Observable<Record<string, unknown>> {
  return readFile(filePath).pipe(map(data => JSON.parse(data)));
}

/**
 * Write data to the file
 *
 * @param filePath
 * @param data
 * @returns
 */
export function writeFile(filePath: string, data: Parameters<typeof promises.writeFile>[1]): Observable<void> {
  return defer(() => promises.writeFile(filePath, data, { encoding: 'utf-8' }));
}
