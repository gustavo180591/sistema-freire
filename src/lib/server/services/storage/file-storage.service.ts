// src/lib/server/services/storage/file-storage.service.ts
import { readFile, writeFile, unlink, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';

const STORAGE_BASE_DIR = 'storage/private/payslips';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = ['application/pdf'];

export interface FileUploadResult {
	key: string;
	filePath: string;
	fileSize: number;
	mimeType: string;
}

export interface FileValidationResult {
	valid: boolean;
	error?: string;
}

/**
 * Servicio de almacenamiento privado para archivos de recibos
 * Los archivos se guardan en storage/private/payslips/ fuera de static/
 * La estructura es: storage/private/payslips/{year}/{month}/{teacherId}/{uuid}.pdf
 */
export class FileStorageService {
	/**
	 * Valida un archivo antes de subirlo
	 */
	static validateFile(file: File): FileValidationResult {
		// Validar tamaño
		if (file.size > MAX_FILE_SIZE) {
			return {
				valid: false,
				error: `El archivo excede el tamaño máximo de ${MAX_FILE_SIZE / 1024 / 1024}MB`
			};
		}

		if (file.size === 0) {
			return {
				valid: false,
				error: 'El archivo está vacío'
			};
		}

		// Validar tipo MIME
		if (!ALLOWED_MIME_TYPES.includes(file.type)) {
			return {
				valid: false,
				error: `Tipo de archivo no permitido. Solo se acepta PDF.`
			};
		}

		// Validar extensión
		if (!file.name.toLowerCase().endsWith('.pdf')) {
			return {
				valid: false,
				error: 'El archivo debe tener extensión .pdf'
			};
		}

		return { valid: true };
	}

	/**
	 * Valida magic bytes de un PDF
	 */
	static async validatePDFMagicBytes(buffer: Buffer): Promise<boolean> {
		// PDF magic bytes: %PDF- (25 50 44 46 2D)
		if (buffer.length < 5) return false;
		return (
			buffer[0] === 0x25 &&
			buffer[1] === 0x50 &&
			buffer[2] === 0x44 &&
			buffer[3] === 0x46 &&
			buffer[4] === 0x2d
		);
	}

	/**
	 * Genera la ruta de almacenamiento para un recibo
	 */
	static generateStoragePath(teacherId: string, periodYear: number, periodMonth: number): string {
		const uuid = randomUUID();
		return join(
			STORAGE_BASE_DIR,
			String(periodYear),
			String(periodMonth).padStart(2, '0'),
			teacherId,
			`${uuid}.pdf`
		);
	}

	/**
	 * Genera una clave única para el archivo
	 */
	static generateFileKey(teacherId: string, periodYear: number, periodMonth: number): string {
		const uuid = randomUUID();
		return `${periodYear}/${periodMonth.toString().padStart(2, '0')}/${teacherId}/${uuid}.pdf`;
	}

	/**
	 * Guarda un archivo en el almacenamiento privado
	 */
	static async saveFile(
		file: File,
		teacherId: string,
		periodYear: number,
		periodMonth: number
	): Promise<FileUploadResult> {
		// Validar archivo
		const validation = this.validateFile(file);
		if (!validation.valid) {
			throw new Error(validation.error);
		}

		// Convertir File a Buffer
		const arrayBuffer = await file.arrayBuffer();
		const buffer = Buffer.from(arrayBuffer);

		// Validar magic bytes
		const isValidPDF = await this.validatePDFMagicBytes(buffer);
		if (!isValidPDF) {
			throw new Error('El archivo no es un PDF válido');
		}

		// Generar ruta y clave
		const filePath = this.generateStoragePath(teacherId, periodYear, periodMonth);
		const fileKey = this.generateFileKey(teacherId, periodYear, periodMonth);

		// Crear directorios si no existen
		const dirPath = join(process.cwd(), filePath);
		const dir = dirPath.substring(0, dirPath.lastIndexOf('/'));
		if (!existsSync(dir)) {
			await mkdir(dir, { recursive: true });
		}

		// Guardar archivo
		await writeFile(dirPath, buffer);

		return {
			key: fileKey,
			filePath,
			fileSize: buffer.length,
			mimeType: file.type
		};
	}

	/**
	 * Lee un archivo del almacenamiento privado
	 */
	static async readFile(fileKey: string): Promise<Buffer> {
		const filePath = join(process.cwd(), fileKey);

		if (!existsSync(filePath)) {
			throw new Error('Archivo no encontrado');
		}

		return readFile(filePath);
	}

	/**
	 * Elimina un archivo del almacenamiento privado
	 */
	static async deleteFile(fileKey: string): Promise<void> {
		const filePath = join(process.cwd(), fileKey);

		if (existsSync(filePath)) {
			await unlink(filePath);
		}
	}

	/**
	 * Verifica si un archivo existe
	 */
	static async fileExists(fileKey: string): Promise<boolean> {
		const filePath = join(process.cwd(), fileKey);
		return existsSync(filePath);
	}
}
