import { useCallback, useEffect, useState } from 'react';
import { getUpdateInfo } from '@/services/appUpdate.service';
import { getInstalledAppVersion } from '@/utils/appVersion';
import { isVersionOutdated } from '@/utils/versionUtils';
import type { AppUpdateInfo } from '@/models';

// Chequea una vez al montar si hay una actualización disponible y activa.
// `dismissed` vive solo en memoria: "Ahora no" oculta el aviso hasta la
// próxima apertura de la app, no lo silencia para siempre.
export function useAppUpdateCheck() {
  const [updateInfo, setUpdateInfo] = useState<AppUpdateInfo | null>(null);
  const [dismissed, setDismissed] = useState(false);

  const installedVersion = getInstalledAppVersion();

  useEffect(() => {
    getUpdateInfo().then(setUpdateInfo);
  }, []);

  const dismiss = useCallback(() => setDismissed(true), []);

  const shouldShowUpdate = Boolean(
    !dismissed &&
      updateInfo?.active &&
      updateInfo?.latestVersion &&
      installedVersion &&
      isVersionOutdated(installedVersion, updateInfo.latestVersion),
  );

  return {
    shouldShowUpdate,
    title: updateInfo?.title ?? '',
    message: updateInfo?.message ?? '',
    downloadUrl: updateInfo?.downloadUrl ?? '',
    installedVersion,
    latestVersion: updateInfo?.latestVersion ?? '',
    dismiss,
  };
}
