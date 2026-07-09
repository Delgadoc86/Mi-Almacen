/**
 * Compara dos versiones semver-like ("1.10.2") componente por componente
 * (numérico), no como string — evita que "1.9.0" > "1.10.0" por orden
 * lexicográfico.
 *
 * @returns negativo si a < b, positivo si a > b, 0 si son iguales.
 */
export function compareVersions(a: string, b: string): number {
  const partsA = String(a).split('.').map(Number);
  const partsB = String(b).split('.').map(Number);
  const length = Math.max(partsA.length, partsB.length);

  for (let i = 0; i < length; i++) {
    const numA = partsA[i] ?? 0;
    const numB = partsB[i] ?? 0;
    if (numA !== numB) return numA - numB;
  }
  return 0;
}

export function isVersionOutdated(installedVersion: string, latestVersion: string): boolean {
  return compareVersions(installedVersion, latestVersion) < 0;
}
