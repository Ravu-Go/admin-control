import { expect, it } from 'vitest';
import { safeReturnPath } from './LoginPage';
it.each(['https://external.example/path', '//external.example/path', '/\\external.example', '/login', '/accounts?email=person@example.test', null])('rejects unsafe or unrecognised return destination %s', value => {
  expect(safeReturnPath(value)).toBe('/');
});
it('preserves an allowed admin deep link after sign-in', () => { expect(safeReturnPath('/accounts')).toBe('/accounts'); });
