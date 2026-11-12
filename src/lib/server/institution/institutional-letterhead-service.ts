import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import {
	AuditAction,
	DocumentAccessAction,
	DocumentCategory,
	DocumentOwnerType,
	DocumentStatus,
	DocumentSubType,
	DocumentVisibility
} from '@prisma/client';

import { auditLog } from '$lib/server/audit';
import { prisma } from '$lib/server/db/prisma';
import { documentStorageService } from '$lib/server/document-management/document-storage.service';

const LETTERHEAD_OWNER_ID = 'paulo-freire';
const LETTERHEAD_TAG = 'institutional-letterhead';
const FALLBACK_LETTERHEAD_FILE = 'membrete-freire.jpeg';

export const INSTITUTIONAL_LETTERHEAD_MAX_SIZE = 5 * 1024 * 1024;

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png']);
const ALLOWED_EXTENSIONS = new Set(['jpg', 'jpeg', 'png']);

export class InstitutionalLetterheadValidationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'InstitutionalLetterheadValidationError';
	}
}

function extensionFromFilename(filename: string): string {
	const index = filename.lastIndexOf('.');

	if (index === -1) {
		return '';
	}

	return filename.slice(index + 1).toLowerCase();
}

function hasValidJpegSignature(buffer: Buffer): boolean {
	return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
}

function hasValidPngSignature(buffer: Buffer): boolean {
	if (buffer.length < 8) {
		return false;
	}

	const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

	return signature.every((byte, index) => buffer[index] === byte);
}

async function validateImageSignature(file: File): Promise<void> {
	const buffer = Buffer.from(await file.arrayBuffer());

	if (file.type === 'image/jpeg' && !hasValidJpegSignature(buffer)) {
		throw new InstitutionalLetterheadValidationError(
			'El archivo no contiene una imagen JPEG válida'
		);
	}

	if (file.type === 'image/png' && !hasValidPngSignature(buffer)) {
		throw new InstitutionalLetterheadValidationError(
			'El archivo no contiene una imagen PNG válida'
		);
	}
}

export async function validateInstitutionalLetterheadFile(file: File): Promise<void> {
	if (file.size <= 0) {
		throw new InstitutionalLetterheadValidationError('Seleccioná una imagen');
	}

	if (file.size > INSTITUTIONAL_LETTERHEAD_MAX_SIZE) {
		throw new InstitutionalLetterheadValidationError('El membrete no puede superar los 5 MB');
	}

	if (!ALLOWED_TYPES.has(file.type)) {
		throw new InstitutionalLetterheadValidationError(
			'El membrete debe ser una imagen JPG, JPEG o PNG'
		);
	}

	const extension = extensionFromFilename(file.name);

	if (!ALLOWED_EXTENSIONS.has(extension)) {
		throw new InstitutionalLetterheadValidationError(
			'La extensión del archivo debe ser JPG, JPEG o PNG'
		);
	}

	if (
		(file.type === 'image/jpeg' && !['jpg', 'jpeg'].includes(extension)) ||
		(file.type === 'image/png' && extension !== 'png')
	) {
		throw new InstitutionalLetterheadValidationError(
			'La extensión del archivo no coincide con el tipo de imagen'
		);
	}

	await validateImageSignature(file);
}

export async function getActiveInstitutionalLetterheadDocument() {
	return prisma.document.findFirst({
		where: {
			ownerType: DocumentOwnerType.INSTITUTION,
			ownerId: LETTERHEAD_OWNER_ID,
			category: DocumentCategory.ADMINISTRATIVE,
			subType: DocumentSubType.GENERAL,
			status: DocumentStatus.ACTIVE,
			tags: {
				has: LETTERHEAD_TAG
			}
		},
		include: {
			uploadedBy: {
				select: {
					id: true,
					firstName: true,
					lastName: true,
					email: true
				}
			}
		},
		orderBy: {
			createdAt: 'desc'
		}
	});
}

export async function getInstitutionalLetterheadAsset(): Promise<{
	buffer: Buffer;
	mimeType: string;
	fileName: string;
	source: 'configured' | 'fallback';
	documentId: string | null;
	updatedAt: Date | null;
}> {
	const document = await getActiveInstitutionalLetterheadDocument();

	if (document) {
		const exists = await documentStorageService.documentFileExists(document.storageKey);

		if (exists) {
			return {
				buffer: await documentStorageService.readDocumentFile(document.storageKey),
				mimeType: document.mimeType,
				fileName: document.originalName,
				source: 'configured',
				documentId: document.id,
				updatedAt: document.updatedAt
			};
		}

		console.error(`Membrete institucional configurado sin archivo físico: ${document.id}`);
	}

	const fallbackPath = resolve(process.cwd(), 'static', FALLBACK_LETTERHEAD_FILE);

	return {
		buffer: await readFile(fallbackPath),
		mimeType: 'image/jpeg',
		fileName: FALLBACK_LETTERHEAD_FILE,
		source: 'fallback',
		documentId: null,
		updatedAt: null
	};
}

export async function saveInstitutionalLetterhead(input: { file: File; userId: string }) {
	await validateInstitutionalLetterheadFile(input.file);

	const extension = extensionFromFilename(input.file.name);

	const storageKey = documentStorageService.generateStorageKey({
		ownerType: DocumentOwnerType.INSTITUTION,
		ownerId: LETTERHEAD_OWNER_ID,
		category: DocumentCategory.ADMINISTRATIVE,
		extension
	});

	await documentStorageService.saveDocumentFile({
		file: input.file,
		storageKey
	});

	const sha256Hash = await documentStorageService.calculateSha256(input.file);

	try {
		return await prisma.$transaction(async (tx) => {
			await tx.document.updateMany({
				where: {
					ownerType: DocumentOwnerType.INSTITUTION,
					ownerId: LETTERHEAD_OWNER_ID,
					category: DocumentCategory.ADMINISTRATIVE,
					subType: DocumentSubType.GENERAL,
					status: DocumentStatus.ACTIVE,
					tags: {
						has: LETTERHEAD_TAG
					}
				},
				data: {
					status: DocumentStatus.REPLACED
				}
			});

			const document = await tx.document.create({
				data: {
					originalName: input.file.name,
					storedName: storageKey.split('/').pop() ?? storageKey,
					storageKey,
					mimeType: input.file.type,
					extension: `.${extension}`,
					sizeBytes: input.file.size,
					sha256Hash,
					ownerType: DocumentOwnerType.INSTITUTION,
					ownerId: LETTERHEAD_OWNER_ID,
					category: DocumentCategory.ADMINISTRATIVE,
					subType: DocumentSubType.GENERAL,
					status: DocumentStatus.ACTIVE,
					visibility: DocumentVisibility.INTERNAL,
					uploadedById: input.userId,
					metadata: {
						kind: LETTERHEAD_TAG
					},
					tags: [LETTERHEAD_TAG]
				}
			});

			await tx.documentAccessLog.create({
				data: {
					documentId: document.id,
					userId: input.userId,
					action: DocumentAccessAction.UPLOAD,
					metadata: {
						kind: LETTERHEAD_TAG
					}
				}
			});

			await auditLog(
				{
					action: AuditAction.UPDATE,
					entityType: 'InstitutionalLetterhead',
					entityId: document.id,
					description: 'Membrete institucional actualizado',
					userId: input.userId,
					metadata: {
						fileName: input.file.name,
						mimeType: input.file.type,
						sizeBytes: input.file.size
					}
				},
				tx
			);

			return document;
		});
	} catch (error) {
		try {
			await documentStorageService.deleteDocumentFileForCleanup(storageKey);
		} catch (cleanupError) {
			console.error('No se pudo limpiar el archivo del membrete luego del rollback:', cleanupError);
		}

		throw error;
	}
}
