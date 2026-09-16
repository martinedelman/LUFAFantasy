/**
 * Reemplazo estable del módulo virtual opcional de Vercel Flags.
 * Sin una definición embebida, el SDK continúa con su fallback normal tanto
 * en builds locales como en deployments que no generan el módulo virtual.
 */
export function get(): null {
  return null;
}
