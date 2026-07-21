/**
 * Configuración centralizada del sistema
 *
 * Este archivo contiene constantes de configuración que pueden requerir
 * ajustes según el entorno o integraciones externas.
 *
 * NOTA: La URL del portal de recibos de sueldo ahora se configura dinámicamente
 * a través de la base de datos (tabla financial_config) y se obtiene desde el backend.
 * No use PAYSLLIP_PORTAL_URL directamente en el código frontend.
 */

/**
 * Valor por defecto para la URL del portal de recibos de sueldo
 * Este valor se usa solo como fallback si no hay configuración en la base de datos
 */
export const DEFAULT_PAYSLLIP_PORTAL_URL = '';

/**
 * Otras configuraciones externas que puedan necesitarse en el futuro
 */
export const EXTERNAL_CONFIG = {
	payslipPortalUrl: DEFAULT_PAYSLLIP_PORTAL_URL
} as const;
