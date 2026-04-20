import { TOTP, Secret } from 'otpauth';
import QRCode from 'qrcode';
import crypto from 'crypto';

const APP_NAME = 'Paulo Freire';

// Generar secreto base32 aleatorio (20 bytes = 160 bits)
function generateBase32Secret(): string {
    const buffer = crypto.randomBytes(20);
    return buffer.toString('base64')
        .replace(/[^A-Z2-7]/gi, '')
        .slice(0, 32)
        .toUpperCase();
}

// Generar nuevo secreto TOTP para un usuario
export function generateTOTPSecret(userId: string, email: string): {
    secret: string;
    uri: string;
} {
    const secretBase32 = generateBase32Secret();
    const secret = Secret.fromBase32(secretBase32);
    
    const totp = new TOTP({
        issuer: APP_NAME,
        label: email,
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret
    });

    return {
        secret: secretBase32,
        uri: totp.toString()
    };
}

// Generar QR code como data URL
export async function generateQRCode(uri: string): Promise<string> {
    return QRCode.toDataURL(uri, {
        width: 256,
        margin: 2,
        color: {
            dark: '#000000',
            light: '#ffffff'
        }
    });
}

// Verificar código TOTP
export function verifyTOTP(secretBase32: string, token: string): boolean {
    const secret = Secret.fromBase32(secretBase32);
    const totp = new TOTP({
        secret,
        algorithm: 'SHA1',
        digits: 6,
        period: 30
    });

    // Verifica con ventana de 1 periodo antes/después (tolerancia de 30s)
    return totp.validate({ token, window: 1 }) !== null;
}

// Generar código TOTP actual (para testing)
export function generateCurrentTOTP(secretBase32: string): string {
    const secret = Secret.fromBase32(secretBase32);
    const totp = new TOTP({
        secret,
        algorithm: 'SHA1',
        digits: 6,
        period: 30
    });

    return totp.generate();
}

// Formatear secreto para mostrar (grupos de 4 caracteres)
export function formatSecret(secret: string): string {
    return secret.match(/.{1,4}/g)?.join(' ') || secret;
}
