// Tests unitarios puros — sin React, sin Firebase. Misma convención que
// resolvePlanStatus.test.ts (node:test + type-stripping de Node, ver
// package.json "test:unit").
import test from 'node:test';
import assert from 'node:assert/strict';
import { compareVersions, isVersionOutdated } from './versionUtils.ts';

test('compareVersions: "1.0.10" es mayor que "1.0.2" (numérico, no lexicográfico)', () => {
  assert.ok(compareVersions('1.0.10', '1.0.2') > 0);
});

test('compareVersions: "1.2.0" es mayor que "1.1.9"', () => {
  assert.ok(compareVersions('1.2.0', '1.1.9') > 0);
});

test('compareVersions: "1.0.0" es igual a "1.0.0"', () => {
  assert.equal(compareVersions('1.0.0', '1.0.0'), 0);
});

test('compareVersions: partes ausentes cuentan como 0 ("1.2" vs "1.2.1")', () => {
  assert.ok(compareVersions('1.2', '1.2.1') < 0);
});

test('isVersionOutdated: true cuando la instalada es menor que la última', () => {
  assert.equal(isVersionOutdated('1.0.2', '1.0.10'), true);
});

test('isVersionOutdated: false cuando son iguales', () => {
  assert.equal(isVersionOutdated('1.0.0', '1.0.0'), false);
});

test('isVersionOutdated: false cuando la instalada es mayor', () => {
  assert.equal(isVersionOutdated('1.2.0', '1.1.9'), false);
});
