const MS_POR_DIA = 24 * 60 * 60 * 1000;

/** Umbral de negocio: solo se puede renovar cuando falta esto o menos para vencer. */
const DIAS_MINIMOS_PARA_RENOVAR = 7;

function parseFechaISO(fecha: string): Date {
  const [year, month, day] = fecha.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function hoyLocal(): Date {
  const ahora = new Date();
  return new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
}

/**
 * Días de calendario entre hoy y la fecha de vencimiento (fecha ISO "YYYY-MM-DD").
 * Negativo si la membresía ya venció.
 */
export function diasHastaVencimiento(fechaVencimiento: string): number {
  const diff = parseFechaISO(fechaVencimiento).getTime() - hoyLocal().getTime();
  return Math.round(diff / MS_POR_DIA);
}

/**
 * La membresía solo es renovable si ya venció o si le queda una semana o menos.
 * Un cliente con mensualidad pagada por más de una semana no debe poder renovarse
 * todavía (evita acumular renovaciones anticipadas sobre un plan vigente).
 */
export function esRenovable(fechaVencimiento: string): boolean {
  return diasHastaVencimiento(fechaVencimiento) <= DIAS_MINIMOS_PARA_RENOVAR;
}
