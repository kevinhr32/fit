export function buildWhatsAppUrl(
  telefono: string,
  nombre: string,
  gymName: string,
  fechaVencimiento: string
): string {
  const numero = `57${telefono.replace(/\D/g, '')}`;
  const mensaje = `Hola ${nombre}, tu membresía en ${gymName} vence el ${fechaVencimiento}. ¡Te esperamos para renovar!`;
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
}

export function formatearFechaCorta(fecha: string): string {
  if (!fecha) return '';
  const d = new Date(fecha);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}
