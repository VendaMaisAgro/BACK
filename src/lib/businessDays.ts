/** Retorna true se a data cair num dia útil (segunda–sexta). */
function isBusinessDay(date: Date): boolean {
  const dow = date.getDay();
  return dow !== 0 && dow !== 6;
}

/** Adiciona N dias úteis a uma data. */
export function addBusinessDays(date: Date, days: number): Date {
  const result = new Date(date);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    if (isBusinessDay(result)) added++;
  }
  return result;
}

/**
 * Verifica se `target` está dentro de `maxDays` dias úteis a partir de `from`.
 * Usado para validar o limite de reagendamento (Cláusula 9 – 3 dias úteis).
 */
export function isWithinBusinessDays(from: Date, target: Date, maxDays: number): boolean {
  const deadline = addBusinessDays(from, maxDays);
  return target <= deadline;
}

/**
 * Retorna true se restar menos de `hours` horas entre agora e `targetDate`.
 * Usado para a trava de 24h (Cláusulas 7 e 9).
 */
export function lessThanHoursRemaining(targetDate: Date, hours: number, now = new Date()): boolean {
  const diffMs = targetDate.getTime() - now.getTime();
  return diffMs < hours * 60 * 60 * 1000;
}
