import { describe, expect, it } from 'vitest';
import { RoleCode } from '@prisma/client';
import {
	canUseRole,
	getRoleHomeRoute,
	getSessionEntryRoute,
	resolveActiveRole
} from './active-role';

describe('resolveActiveRole', () => {
	it('mantiene el rol almacenado cuando sigue asignado', () => {
		const result = resolveActiveRole([RoleCode.DIRECTOR, RoleCode.DOCENTE], RoleCode.DOCENTE);

		expect(result).toBe(RoleCode.DOCENTE);
	});

	it('descarta un rol almacenado que ya no está asignado en un usuario multirol', () => {
		const result = resolveActiveRole([RoleCode.SECRETARIA, RoleCode.FINANZAS], RoleCode.DOCENTE);

		expect(result).toBeNull();
	});

	it('selecciona automáticamente el único rol asignado', () => {
		const result = resolveActiveRole([RoleCode.DOCENTE], null);

		expect(result).toBe(RoleCode.DOCENTE);
	});

	it('requiere selección cuando existen múltiples roles y no hay rol almacenado', () => {
		const result = resolveActiveRole([RoleCode.SECRETARIA, RoleCode.FINANZAS], null);

		expect(result).toBeNull();
	});

	it('devuelve null cuando el usuario no tiene roles', () => {
		expect(resolveActiveRole([], null)).toBeNull();
	});
});

describe('canUseRole', () => {
	it('permite únicamente roles realmente asignados', () => {
		const roles = [RoleCode.SECRETARIA, RoleCode.FINANZAS];

		expect(canUseRole(roles, RoleCode.FINANZAS)).toBe(true);
		expect(canUseRole(roles, RoleCode.DOCENTE)).toBe(false);
	});
});

describe('getRoleHomeRoute', () => {
	it.each([
		[RoleCode.SUPERADMIN, '/dashboard'],
		[RoleCode.DIRECTOR, '/dashboard'],
		[RoleCode.DOCENTE, '/docente'],
		[RoleCode.PRECEPTOR, '/preceptor'],
		[RoleCode.FINANZAS, '/finanzas'],
		[RoleCode.ALUMNO, '/alumno'],
		[RoleCode.LIQUIDADOR, '/recibos'],
		[RoleCode.SIN_TIPO, '/']
	] as const)('resuelve %s a %s', (role, expectedRoute) => {
		expect(getRoleHomeRoute(role)).toBe(expectedRoute);
	});

	it('devuelve la raíz cuando no existe rol activo', () => {
		expect(getRoleHomeRoute(null)).toBe('/');
	});
});

describe('getSessionEntryRoute', () => {
	it('redirige al home del rol activo', () => {
		expect(getSessionEntryRoute([RoleCode.SECRETARIA, RoleCode.FINANZAS], RoleCode.FINANZAS)).toBe(
			'/finanzas'
		);
	});

	it('redirige al selector cuando hay múltiples roles sin rol activo', () => {
		expect(getSessionEntryRoute([RoleCode.SECRETARIA, RoleCode.FINANZAS], null)).toBe(
			'/seleccionar-vista'
		);
	});

	it('devuelve la raíz cuando no existen roles', () => {
		expect(getSessionEntryRoute([], null)).toBe('/');
	});
});
