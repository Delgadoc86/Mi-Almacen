import { Linking } from 'react-native';
import { ConfirmDialog } from '@/components/ui';
import { SUPPORT_URL } from '@/constants';

type Props = {
  message: string | null;
  onDismiss: () => void;
};

function openSupportSite() {
  Linking.openURL(SUPPORT_URL).catch(() => {});
}

// useWriteGuard solo expone el mensaje final (string), no el kind — pero
// cada mensaje es un texto fijo por estado (ver RESTRICTION_MESSAGE_BY_KIND
// en useWriteGuard.ts), así que distinguir "trial vencido" del resto por
// substring es tan estable como comparar el kind directamente, sin tener
// que pasar el kind a través de los ~14 call sites de este modal.
function contactLabel(message: string | null) {
  return message?.includes('Activá Pro') ? 'Activar Pro' : 'Contactar soporte';
}

// Modal informativo que se muestra cuando useWriteGuard() bloquea una
// acción. Reusa ConfirmDialog: el botón secundario (el slot de onCancel)
// abre el sitio de contacto sin cerrar el modal — el usuario vuelve de la
// web y sigue viendo "Entendido" para salir.
export function PlanRestrictionDialog({ message, onDismiss }: Props) {
  return (
    <ConfirmDialog
      visible={Boolean(message)}
      title="Función no disponible"
      message={message ?? ''}
      confirmLabel="Entendido"
      cancelLabel={contactLabel(message)}
      onConfirm={onDismiss}
      onCancel={openSupportSite}
    />
  );
}
