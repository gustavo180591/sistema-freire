import * as crypto from 'crypto';

/**
 * Módulo de encriptación para datos sensibles
 * Utiliza AES-256-GCM para encriptación segura
 */

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits
const SALT_LENGTH = 16;
const TAG_LENGTH = 16;
const TAG_POSITION = SALT_LENGTH + IV_LENGTH;
const ENCRYPTED_POSITION = TAG_POSITION + TAG_LENGTH;

/**
 * Obtiene la clave de encriptación desde variables de entorno
 * @throws Error si las variables de entorno no están configuradas
 */
function getEncryptionKey(): Buffer {
	const key = process.env.ENCRYPTION_KEY;
	if (!key) {
		throw new Error('ENCRYPTION_KEY no está configurada en variables de entorno');
	}
	return Buffer.from(key, 'hex');
}

/**
 * Obtiene el IV de encriptación desde variables de entorno
 * @throws Error si las variables de entorno no están configuradas
 */
function getEncryptionIV(): Buffer {
	const iv = process.env.ENCRYPTION_KEY_IV;
	if (!iv) {
		throw new Error('ENCRYPTION_KEY_IV no está configurada en variables de entorno');
	}
	return Buffer.from(iv, 'hex');
}

/**
 * Encripta un texto usando AES-256-GCM
 * @param text - Texto plano a encriptar
 * @returns Texto encriptado en formato base64 (salt + iv + tag + ciphertext)
 * @throws Error si el texto está vacío o hay error de encriptación
 */
export async function encrypt(text: string): Promise<string> {
	if (!text || text.trim() === '') {
		throw new Error('El texto a encriptar no puede estar vacío');
	}

	try {
		const key = getEncryptionKey();
		const iv = getEncryptionIV();

		// Generar salt aleatorio para cada encriptación
		const salt = crypto.randomBytes(SALT_LENGTH);

		// Crear cipher
		const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

		// Encriptar
		let encrypted = cipher.update(text, 'utf8', 'hex');
		encrypted += cipher.final('hex');

		// Obtener tag de autenticación
		const tag = cipher.getAuthTag();

		// Combinar: salt + iv + tag + encrypted
		const combined = Buffer.concat([salt, iv, tag, Buffer.from(encrypted, 'hex')]);

		// Retornar en base64
		return combined.toString('base64');
	} catch (error) {
		console.error('Error al encriptar:', error);
		throw new Error('Error al encriptar el texto');
	}
}

/**
 * Desencripta un texto encriptado usando AES-256-GCM
 * @param encryptedText - Texto encriptado en formato base64
 * @returns Texto plano original
 * @throws Error si el texto está vacío, formato inválido o hay error de desencriptación
 */
export async function decrypt(encryptedText: string): Promise<string> {
	if (!encryptedText || encryptedText.trim() === '') {
		throw new Error('El texto a desencriptar no puede estar vacío');
	}

	try {
		const key = getEncryptionKey();
		const iv = getEncryptionIV();

		// Decodificar desde base64
		const combined = Buffer.from(encryptedText, 'base64');

		// Extraer componentes
		const salt = combined.subarray(0, SALT_LENGTH);
		const extractedIv = combined.subarray(SALT_LENGTH, TAG_POSITION);
		const tag = combined.subarray(TAG_POSITION, ENCRYPTED_POSITION);
		const encrypted = combined.subarray(ENCRYPTED_POSITION);

		// Crear decipher
		const decipher = crypto.createDecipheriv(ALGORITHM, key, extractedIv);

		// Setear tag de autenticación
		decipher.setAuthTag(tag);

		// Desencriptar
		let decrypted = decipher.update(encrypted);
		decrypted = Buffer.concat([decrypted, decipher.final()]);

		// Retornar como string UTF-8
		return decrypted.toString('utf8');
	} catch (error) {
		console.error('Error al desencriptar:', error);
		throw new Error('Error al desencriptar el texto. Verifica que las claves sean correctas.');
	}
}

/**
 * Verifica si un texto está encriptado (formato base64 válido)
 * @param text - Texto a verificar
 * @returns true si parece estar encriptado, false en caso contrario
 */
export function isEncrypted(text: string): boolean {
	if (!text) return false;
	try {
		const decoded = Buffer.from(text, 'base64');
		// Verificar longitud mínima: salt + iv + tag + algo de datos
		return decoded.length >= SALT_LENGTH + IV_LENGTH + TAG_LENGTH + 1;
	} catch {
		return false;
	}
}

/**
 * Encripta de forma segura, manejando datos null/undefined
 * @param text - Texto a encriptar (puede ser null/undefined)
 * @returns Texto encriptado o null si el input es null/undefined
 */
export async function encryptSafe(text: string | null | undefined): Promise<string | null> {
	if (!text) return null;
	return await encrypt(text);
}

/**
 * Desencripta de forma segura, manejando datos null/undefined
 * @param text - Texto a desencriptar (puede ser null/undefined)
 * @returns Texto desencriptado o null si el input es null/undefined
 */
export async function decryptSafe(text: string | null | undefined): Promise<string | null> {
	if (!text) return null;
	return await decrypt(text);
}
