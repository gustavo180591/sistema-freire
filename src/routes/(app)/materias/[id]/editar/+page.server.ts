import { error, fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { prisma } from '$lib/server/db/prisma';
import { requirePermission } from '$lib/server/auth/permissions-granular';

export const load: PageServerLoad = async ({ params, locals }) => {
    const user = locals.user;
    if (!user) throw redirect(302, '/login');
    
    requirePermission(user, 'SUBJECT', 'edit');
    
    const subject = await prisma.subject.findUnique({
        where: { id: params.id },
        include: {
            careerSubjects: {
                include: {
                    career: {
                        select: { id: true, code: true, name: true }
                    }
                }
            },
            correlatives: {
                include: {
                    requiredSubject: {
                        select: { id: true, code: true, name: true }
                    }
                }
            }
        }
    });
    
    if (!subject) {
        throw error(404, 'Materia no encontrada');
    }
    
    const careers = await prisma.career.findMany({
        where: { active: true },
        select: { id: true, code: true, name: true }
    });
    
    const allSubjects = await prisma.subject.findMany({
        where: { 
            id: { not: params.id },
            active: true 
        },
        select: { id: true, code: true, name: true, yearLevel: true }
    });
    
    return {
        subject,
        careers,
        allSubjects
    };
};

export const actions: Actions = {
    update: async ({ request, params, locals }) => {
        const user = locals.user;
        if (!user) throw redirect(302, '/login');
        
        requirePermission(user, 'SUBJECT', 'edit');
        
        const formData = await request.formData();
        
        const name = formData.get('name')?.toString();
        const code = formData.get('code')?.toString();
        const subjectType = formData.get('subjectType')?.toString();
        const trainingField = formData.get('trainingField')?.toString();
        const yearLevel = parseInt(formData.get('yearLevel')?.toString() || '1');
        const accreditationMode = formData.get('accreditationMode')?.toString();
        const hoursPerWeek = parseInt(formData.get('hoursPerWeek')?.toString() || '0') || null;
        const description = formData.get('description')?.toString() || null;
        
        if (!name || !code || !subjectType || !trainingField || !accreditationMode) {
            return fail(400, { error: 'Datos requeridos faltantes' });
        }
        
        try {
            await prisma.subject.update({
                where: { id: params.id },
                data: {
                    name,
                    code,
                    subjectType: subjectType as any,
                    trainingField: trainingField as any,
                    yearLevel,
                    accreditationMode: accreditationMode as any,
                    hoursPerWeek,
                    description
                }
            });
            
            return { success: true };
        } catch (e) {
            console.error(e);
            return fail(500, { error: 'Error al actualizar la materia' });
        }
    },
    
    addCareer: async ({ request, params, locals }) => {
        const user = locals.user;
        if (!user) throw redirect(302, '/login');
        
        requirePermission(user, 'SUBJECT', 'edit');
        
        const formData = await request.formData();
        const careerId = formData.get('careerId')?.toString();
        const yearLevel = parseInt(formData.get('yearLevel')?.toString() || '1');
        
        if (!careerId) {
            return fail(400, { error: 'Carrera requerida' });
        }
        
        try {
            await prisma.careerSubject.upsert({
                where: {
                    careerId_subjectId: {
                        careerId,
                        subjectId: params.id
                    }
                },
                update: { yearLevel },
                create: {
                    careerId,
                    subjectId: params.id,
                    yearLevel,
                    isMandatory: true
                }
            });
            
            return { success: true };
        } catch (e) {
            console.error(e);
            return fail(500, { error: 'Error al agregar carrera' });
        }
    },
    
    removeCareer: async ({ request, params, locals }) => {
        const user = locals.user;
        if (!user) throw redirect(302, '/login');
        
        requirePermission(user, 'SUBJECT', 'edit');
        
        const formData = await request.formData();
        const careerId = formData.get('careerId')?.toString();
        
        if (!careerId) {
            return fail(400, { error: 'Carrera requerida' });
        }
        
        try {
            await prisma.careerSubject.deleteMany({
                where: {
                    careerId,
                    subjectId: params.id
                }
            });
            
            return { success: true };
        } catch (e) {
            console.error(e);
            return fail(500, { error: 'Error al remover carrera' });
        }
    }
};
