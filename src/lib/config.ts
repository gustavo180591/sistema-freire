/**
 * Configuración centralizada del sistema
 *
 * Este archivo contiene constantes de configuración que pueden requerir
 * ajustes según el entorno o integraciones externas.
 */

/**
 * URL externa del portal de recibos de sueldo docentes
 *
 * Esta URL debe ser proporcionada por el liquidador cuando el sistema
 * de liquidación de sueldos esté disponible.
 *
 * Si está configurada, la tarjeta de "Recibos de sueldo docentes" en /reportes
 * abrirá esta URL en una nueva pestaña.
 *
 * Si no está configurada (string vacía), la tarjeta se mostrará como
 * "Pendiente de configuración" con un mensaje informativo.
 */
export const PAYSLLIP_PORTAL_URL = '';

/**
 * Otras configuraciones externas que puedan necesitarse en el futuro
 */
export const EXTERNAL_CONFIG = {
	payslipPortalUrl: PAYSLLIP_PORTAL_URL
} as const;
