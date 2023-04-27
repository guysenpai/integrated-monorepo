import { isEven } from '@guysenpai/is-even';

export function isOdd(x: number): boolean {
  return !isEven(x);
}
