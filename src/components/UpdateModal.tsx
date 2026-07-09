import { Linking } from 'react-native';
import { ConfirmDialog } from '@/components/ui';
import { useAppUpdateCheck } from '@/hooks/useAppUpdateCheck';

// Reusa ConfirmDialog (mismo patrón que PlanRestrictionDialog): no bloquea
// el uso de la app — "Ahora no" o tocar fuera lo cierra, y vuelve a
// aparecer recién en el próximo reinicio (useAppUpdateCheck solo chequea
// una vez al montar). "Actualizar ahora" abre la web de descarga, nunca
// descarga directo desde acá.
export function UpdateModal() {
  const { shouldShowUpdate, title, message, downloadUrl, installedVersion, latestVersion, dismiss } =
    useAppUpdateCheck();

  function handleUpdatePress() {
    Linking.openURL(downloadUrl).catch(() => {});
  }

  const fullMessage = `${message}\n\nVersión actual: ${installedVersion ?? '—'}\nNueva versión: ${latestVersion}`;

  return (
    <ConfirmDialog
      visible={shouldShowUpdate}
      title={title || 'Nueva actualización disponible'}
      message={fullMessage}
      confirmLabel="Actualizar ahora"
      cancelLabel="Ahora no"
      onConfirm={handleUpdatePress}
      onCancel={dismiss}
    />
  );
}
