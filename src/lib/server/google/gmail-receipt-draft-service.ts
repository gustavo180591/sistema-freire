import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

import { env } from '$env/dynamic/private';

const GOOGLE_AUTHORIZATION_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GMAIL_API_BASE_URL = 'https://gmail.googleapis.com/gmail/v1';

const GMAIL_COMPOSE_SCOPE = 'https://www.googleapis.com/auth/gmail.compose';

const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

interface GmailOAuthConfig {
	clientId: string;
	clientSecret: string;
	redirectUri: string;
}

interface GmailOAuthStatePayload {
	receiptId: string;
	userId: string;
	expiresAt: number;
	nonce: string;
}

interface GmailTokenResponse {
	access_token?: string;
}

interface GmailProfileResponse {
	emailAddress?: string;
}

interface GmailDraftResponse {
	id?: string;
	message?: {
		id?: string;
	};
}

export interface GmailDraftAttachment {
	filename: string;
	content: Buffer;
	contentType: string;
}

export interface CreateGmailDraftInput {
	from: string;
	to: string;
	subject: string;
	text: string;
	attachment: GmailDraftAttachment;
}

function getGmailOAuthConfig(): GmailOAuthConfig {
	const clientId = env.GOOGLE_GMAIL_CLIENT_ID?.trim();
	const clientSecret = env.GOOGLE_GMAIL_CLIENT_SECRET?.trim();
	const redirectUri = env.GOOGLE_GMAIL_REDIRECT_URI?.trim();

	if (!clientId || !clientSecret || !redirectUri) {
		throw new Error('La integración con Gmail no está configurada');
	}

	return {
		clientId,
		clientSecret,
		redirectUri
	};
}

function getStateSecret(): string {
	const secret = env.SESSION_SECRET?.trim();

	if (!secret) {
		throw new Error('SESSION_SECRET no está configurado');
	}

	return secret;
}

export function isGmailDraftIntegrationConfigured(): boolean {
	return Boolean(
		env.GOOGLE_GMAIL_CLIENT_ID?.trim() &&
		env.GOOGLE_GMAIL_CLIENT_SECRET?.trim() &&
		env.GOOGLE_GMAIL_REDIRECT_URI?.trim() &&
		env.SESSION_SECRET?.trim()
	);
}

function createSignedState(receiptId: string, userId: string): string {
	const payload: GmailOAuthStatePayload = {
		receiptId,
		userId,
		expiresAt: Date.now() + OAUTH_STATE_TTL_MS,
		nonce: randomBytes(16).toString('base64url')
	};

	const encodedPayload = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');

	const signature = createHmac('sha256', getStateSecret())
		.update(encodedPayload)
		.digest('base64url');

	return `${encodedPayload}.${signature}`;
}

export function createGmailAuthorizationUrl(input: { receiptId: string; userId: string }): string {
	const config = getGmailOAuthConfig();

	const authorizationUrl = new URL(GOOGLE_AUTHORIZATION_URL);

	authorizationUrl.searchParams.set('client_id', config.clientId);
	authorizationUrl.searchParams.set('redirect_uri', config.redirectUri);
	authorizationUrl.searchParams.set('response_type', 'code');
	authorizationUrl.searchParams.set('scope', GMAIL_COMPOSE_SCOPE);
	authorizationUrl.searchParams.set('access_type', 'online');
	authorizationUrl.searchParams.set('include_granted_scopes', 'true');

	/*
	 * Cada preparación pide elegir explícitamente la cuenta.
	 * Así evitamos crear el borrador accidentalmente en otra sesión Google.
	 */
	authorizationUrl.searchParams.set('prompt', 'select_account');

	authorizationUrl.searchParams.set('state', createSignedState(input.receiptId, input.userId));

	return authorizationUrl.toString();
}

export function verifyGmailOAuthState(
	state: string,
	expectedUserId: string
): { receiptId: string } {
	const [encodedPayload, receivedSignature, extraPart] = state.split('.');

	if (!encodedPayload || !receivedSignature || extraPart) {
		throw new Error('Estado OAuth inválido');
	}

	const expectedSignature = createHmac('sha256', getStateSecret())
		.update(encodedPayload)
		.digest('base64url');

	const receivedBuffer = Buffer.from(receivedSignature);
	const expectedBuffer = Buffer.from(expectedSignature);

	if (
		receivedBuffer.length !== expectedBuffer.length ||
		!timingSafeEqual(receivedBuffer, expectedBuffer)
	) {
		throw new Error('Firma OAuth inválida');
	}

	let payload: GmailOAuthStatePayload;

	try {
		payload = JSON.parse(
			Buffer.from(encodedPayload, 'base64url').toString('utf8')
		) as GmailOAuthStatePayload;
	} catch {
		throw new Error('Payload OAuth inválido');
	}

	if (
		typeof payload.receiptId !== 'string' ||
		typeof payload.userId !== 'string' ||
		typeof payload.expiresAt !== 'number' ||
		typeof payload.nonce !== 'string'
	) {
		throw new Error('Payload OAuth incompleto');
	}

	if (payload.userId !== expectedUserId) {
		throw new Error('La autorización pertenece a otro usuario');
	}

	if (payload.expiresAt < Date.now()) {
		throw new Error('La autorización de Gmail venció');
	}

	return {
		receiptId: payload.receiptId
	};
}

export async function exchangeGmailAuthorizationCode(code: string): Promise<string> {
	const config = getGmailOAuthConfig();

	const response = await fetch(GOOGLE_TOKEN_URL, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded'
		},
		body: new URLSearchParams({
			code,
			client_id: config.clientId,
			client_secret: config.clientSecret,
			redirect_uri: config.redirectUri,
			grant_type: 'authorization_code'
		})
	});

	if (!response.ok) {
		throw new Error(`Google OAuth rechazó la autorización (${response.status})`);
	}

	const tokenResponse = (await response.json()) as GmailTokenResponse;

	if (!tokenResponse.access_token) {
		throw new Error('Google OAuth no devolvió un access token');
	}

	return tokenResponse.access_token;
}

function validateSingleEmailAddress(value: string): string {
	const email = value.trim();

	if (
		email.length > 254 ||
		email.includes('\r') ||
		email.includes('\n') ||
		!/^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/u.test(email)
	) {
		throw new Error('La dirección de correo electrónico no es válida');
	}

	return email;
}

export async function getGmailProfile(accessToken: string): Promise<{
	emailAddress: string;
}> {
	const response = await fetch(`${GMAIL_API_BASE_URL}/users/me/profile`, {
		headers: {
			Authorization: `Bearer ${accessToken}`
		}
	});

	if (!response.ok) {
		throw new Error(`No se pudo obtener el perfil de Gmail (${response.status})`);
	}

	const profile = (await response.json()) as GmailProfileResponse;

	if (!profile.emailAddress) {
		throw new Error('Gmail no devolvió la dirección de la cuenta');
	}

	return {
		emailAddress: validateSingleEmailAddress(profile.emailAddress)
	};
}

function encodeMimeHeader(value: string): string {
	return `=?UTF-8?B?${Buffer.from(value, 'utf8').toString('base64')}?=`;
}

function encodeBase64Lines(value: Buffer | string): string {
	const buffer = Buffer.isBuffer(value) ? value : Buffer.from(value, 'utf8');
	const encoded = buffer.toString('base64');

	return encoded.match(/.{1,76}/g)?.join('\r\n') ?? '';
}

function sanitizeAttachmentFilename(filename: string): string {
	const sanitized = filename.replace(/[\r\n"\\]/g, '_').trim();

	return sanitized || 'recibo.pdf';
}

function buildRawGmailMessage(input: CreateGmailDraftInput): string {
	const sender = validateSingleEmailAddress(input.from);
	const recipient = validateSingleEmailAddress(input.to);

	const boundary = `freire_${randomBytes(12).toString('hex')}`;
	const filename = sanitizeAttachmentFilename(input.attachment.filename);

	const mimeMessage = [
		`From: ${sender}`,
		`To: ${recipient}`,
		`Subject: ${encodeMimeHeader(input.subject)}`,
		'MIME-Version: 1.0',
		`Content-Type: multipart/mixed; boundary="${boundary}"`,
		'',
		`--${boundary}`,
		'Content-Type: text/plain; charset="UTF-8"',
		'Content-Transfer-Encoding: base64',
		'',
		encodeBase64Lines(input.text),
		`--${boundary}`,
		`Content-Type: ${input.attachment.contentType}; name="${filename}"`,
		`Content-Disposition: attachment; filename="${filename}"`,
		'Content-Transfer-Encoding: base64',
		'',
		encodeBase64Lines(input.attachment.content),
		`--${boundary}--`,
		''
	].join('\r\n');

	return Buffer.from(mimeMessage, 'utf8').toString('base64url');
}

export async function createGmailDraft(
	accessToken: string,
	input: CreateGmailDraftInput
): Promise<{ draftId: string; messageId: string | null }> {
	const raw = buildRawGmailMessage(input);

	const response = await fetch(`${GMAIL_API_BASE_URL}/users/me/drafts`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${accessToken}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			message: {
				raw
			}
		})
	});

	if (!response.ok) {
		throw new Error(`Gmail no pudo crear el borrador (${response.status})`);
	}

	const draft = (await response.json()) as GmailDraftResponse;

	if (!draft.id) {
		throw new Error('Gmail creó una respuesta sin identificador de borrador');
	}

	return {
		draftId: draft.id,
		messageId: draft.message?.id ?? null
	};
}
