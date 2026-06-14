import { Decimal } from '@prisma/client/runtime/library';

/**
 * Helpers para cálculos financieros seguros con Decimal
 * 
 * Todos los cálculos financieros deben usar estos helpers para garantizar
 * precisión decimal y evitar errores de punto flotante.
 */

/**
 * Suma dos Decimals
 */
export function add(a: Decimal, b: Decimal): Decimal {
  return a.add(b);
}

/**
 * Resta dos Decimals
 */
export function subtract(a: Decimal, b: Decimal): Decimal {
  return a.sub(b);
}

/**
 * Multiplica dos Decimals
 */
export function multiply(a: Decimal, b: Decimal): Decimal {
  return a.mul(b);
}

/**
 * Divide dos Decimals
 */
export function divide(a: Decimal, b: Decimal): Decimal {
  if (b.equals(new Decimal(0))) {
    throw new Error('Division by zero');
  }
  return a.div(b);
}

/**
 * Calcula porcentaje de un Decimal
 */
export function percentage(value: Decimal, percent: Decimal): Decimal {
  return multiply(value, divide(percent, new Decimal(100)));
}

/**
 * Aplica descuento porcentual a un valor
 */
export function applyPercentageDiscount(value: Decimal, discountPercent: Decimal): Decimal {
  return subtract(value, percentage(value, discountPercent));
}

/**
 * Aplica descuento fijo a un valor
 */
export function applyFixedDiscount(value: Decimal, discountAmount: Decimal): Decimal {
  const discounted = subtract(value, discountAmount);
  // No permitir valores negativos
  return discounted.lessThan(new Decimal(0)) ? new Decimal(0) : discounted;
}

/**
 * Calcula recargo por mora porcentual
 */
export function calculatePercentageLateFee(value: Decimal, feePercent: Decimal): Decimal {
  return percentage(value, feePercent);
}

/**
 * Calcula recargo por mora fijo
 */
export function calculateFixedLateFee(feeAmount: Decimal): Decimal {
  return feeAmount;
}

/**
 * Redondea un Decimal a 2 decimales
 */
export function roundToTwoDecimals(value: Decimal): Decimal {
  return value.toDecimalPlaces(2);
}

/**
 * Compara si un Decimal es mayor que otro
 */
export function isGreaterThan(a: Decimal, b: Decimal): boolean {
  return a.greaterThan(b);
}

/**
 * Compara si un Decimal es menor que otro
 */
export function isLessThan(a: Decimal, b: Decimal): boolean {
  return a.lessThan(b);
}

/**
 * Compara si un Decimal es igual a otro
 */
export function isEqual(a: Decimal, b: Decimal): boolean {
  return a.equals(b);
}

/**
 * Compara si un Decimal es cero
 */
export function isZero(value: Decimal): boolean {
  return value.equals(new Decimal(0));
}

/**
 * Compara si un Decimal es positivo
 */
export function isPositive(value: Decimal): boolean {
  return value.greaterThan(new Decimal(0));
}

/**
 * Compara si un Decimal es negativo
 */
export function isNegative(value: Decimal): boolean {
  return value.lessThan(new Decimal(0));
}

/**
 * Obtiene el valor absoluto de un Decimal
 */
export function abs(value: Decimal): Decimal {
  return value.abs();
}

/**
 * Convierte un número a Decimal
 */
export function fromNumber(value: number): Decimal {
  return new Decimal(value);
}

/**
 * Convierte un string a Decimal
 */
export function fromString(value: string): Decimal {
  return new Decimal(value);
}

/**
 * Convierte un Decimal a número (usar con precaución)
 */
export function toNumber(value: Decimal): number {
  return value.toNumber();
}

/**
 * Convierte un Decimal a string
 */
export function toString(value: Decimal): string {
  return value.toString();
}

/**
 * Crea un Decimal desde cero
 */
export function zero(): Decimal {
  return new Decimal(0);
}

/**
 * Suma un array de Decimals
 */
export function sum(values: Decimal[]): Decimal {
  return values.reduce((acc, val) => add(acc, val), zero());
}

/**
 * Calcula el promedio de un array de Decimals
 */
export function average(values: Decimal[]): Decimal {
  if (values.length === 0) {
    throw new Error('Cannot calculate average of empty array');
  }
  return divide(sum(values), fromNumber(values.length));
}

/**
 * Formatea un Decimal como moneda (para display)
 */
export function formatCurrency(value: Decimal, locale: string = 'es-AR', currency: string = 'ARS'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(toNumber(value));
}

/**
 * Calcula días entre dos fechas
 */
export function daysBetween(from: Date, to: Date): number {
  const diffTime = Math.abs(to.getTime() - from.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Verifica si una fecha está vencida
 */
export function isOverdue(dueDate: Date, referenceDate: Date = new Date()): boolean {
  return dueDate < referenceDate;
}

/**
 * Calcula días de vencimiento
 */
export function overdueDays(dueDate: Date, referenceDate: Date = new Date()): number {
  if (!isOverdue(dueDate, referenceDate)) {
    return 0;
  }
  return daysBetween(dueDate, referenceDate);
}
