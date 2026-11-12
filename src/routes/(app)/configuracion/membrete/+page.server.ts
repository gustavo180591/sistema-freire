import { error, fail } from '@sveltejs/kit';

import type { Actions, PageServerLoad } from './$types';

import {
	getActiveInstitutionalLetterheadDocument,
	InstitutionalLetterheadValidationError,
	saveInstitutionalLetterhead
} from '$lib/server/institution/institutional-letterhead-service';

const CONFIGURATION_ROLES = ['SUPERADMIN', 'DIRECTOR', 'SECRETARIA', 'APODERADO'] as const;

function canManageLetterhead(user: App.Locals['user']): boolean {
	if (!user) {
		return false;
	}

	return user.roles.some((role) =>
		CONFIGURATION_ROLES.some((configurationRole) => configurationRole === role)
	);
}

function requireConfigurationAccess(
	user: App.Locals['user']
): asserts user is NonNullable<App.Locals['user']> {
	if (!user) {
		throw error(401, 'Usuario no autenticado');
	}

	if (!canManageLetterhead(user)) {
		throw error(403, 'No tenés permisos para administrar el membrete institucional');
	}
}

export const load: PageServerLoad = async ({ locals }) => {
	requireConfigurationAccess(locals.user);

	const current = await getActiveInstitutionalLetterheadDocument();

	return {
		current: current
			? {
					id: current.id,
					fileName: current.originalName,
					mimeType: current.mimeType,
					sizeBytes: current.sizeBytes,
					updatedAt: current.updatedAt,
					uploadedBy: {
						firstName: current.uploadedBy.firstName,
						lastName: current.uploadedBy.lastName,
						email: current.uploadedBy.email
					}
				}
			: null
	};
};

export const actions: Actions = {
	save: async ({ request, locals }) => {
		if (!locals.user?.id) {
			return fail(401, {
				error: 'Usuario no autenticado'
			});
		}

		if (!canManageLetterhead(locals.user)) {
			return fail(403, {
				error: 'No tenés permisos para administrar el membrete institucional'
			});
		}

		const formData = await request.formData();
		const file = formData.get('letterhead');

		if (!(file instanceof File) || file.size === 0) {
			return fail(400, {
				error: 'Seleccioná una imagen para el membrete'
			});
		}

		try {
			const document = await saveInstitutionalLetterhead({
				file,
				userId: locals.user.id
			});

			return {
				success: true,
				documentId: document.id,
				message: 'Membrete institucional actualizado correctamente'
			};
		} catch (uploadError) {
			if (uploadError instanceof InstitutionalLetterheadValidationError) {
				return fail(400, {
					error: uploadError.message
				});
			}

			console.error('Error al actualizar el membrete institucional:', uploadError);

			return fail(500, {
				error: 'No se pudo actualizar el membrete institucional'
			});
		}
	}
};
