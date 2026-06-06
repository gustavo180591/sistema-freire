// src/lib/server/services/payroll/payslip.service.ts
import { prisma } from '$lib/server/db/prisma';
import { FileStorageService } from '$lib/server/services/storage/file-storage.service';
import { PayslipValidator } from '$lib/server/validators/payslip.validator';
import type { CreatePayslipInput, UpdatePayslipInput } from '$lib/server/validators/payslip.validator';

export type PayslipListResult = {
    payslips: {
        id: string;
        period: string;
        teacher: string;
        amount: number;
        status: string;
    }[];
    metrics: {
        total: number;
        paid: number;
        pending: number;
        totalAmount: number;
    };
};

export async function getPayslipsForUser(user?: {
    id: string;
    role?: string;
}): Promise<PayslipListResult> {
    const isTeacher = user?.role === 'TEACHER';

    const payslips = await prisma.payslip.findMany({
        where: {
            ...(isTeacher
                ? {
                    teacher: {
                        userId: user.id
                    }
                }
                : {}),
            deletedAt: null // Excluir eliminados lógicamente
        },
        include: {
            teacher: {
                include: {
                    user: {
                        select: {
                            firstName: true,
                            lastName: true
                        }
                    }
                }
            }
        },
        orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }]
    });

    const normalized = payslips.map((slip) => ({
        id: slip.id,
        period: `${String(slip.periodMonth).padStart(2, '0')}/${slip.periodYear}`,
        teacher: `${slip.teacher.user.firstName} ${slip.teacher.user.lastName}`.trim(),
        amount: Number(slip.amount),
        status: slip.status
    }));

    return {
        payslips: normalized,
        metrics: {
            total: normalized.length,
            paid: normalized.filter((p) => p.status === 'PAID').length,
            pending: normalized.filter((p) => p.status === 'PENDING').length,
            totalAmount: normalized.reduce((acc, p) => acc + p.amount, 0)
        }
    };
}

export async function getPayslipById(id: string) {
    return prisma.payslip.findUnique({
        where: { id },
        include: {
            teacher: {
                include: {
                    user: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true
                        }
                    }
                }
            }
        }
    });
}

/**
 * Verifica si ya existe un recibo para el mismo docente, mes y año
 */
export async function checkDuplicatePayslip(
    teacherId: string,
    periodMonth: number,
    periodYear: number
): Promise<boolean> {
    const existing = await prisma.payslip.findFirst({
        where: {
            teacherId,
            periodMonth,
            periodYear,
            deletedAt: null
        }
    });
    return existing !== null;
}

/**
 * Crea un nuevo recibo de sueldo
 */
export async function createPayslip(
    data: CreatePayslipInput,
    file: File,
    uploadedBy: string
) {
    // Validar datos
    const validatedData = PayslipValidator.validateCreateInput(data);

    // Verificar duplicado
    const isDuplicate = await checkDuplicatePayslip(
        validatedData.teacherId,
        validatedData.periodMonth,
        validatedData.periodYear
    );

    if (isDuplicate) {
        throw new Error(
            `Ya existe un recibo para el docente en el período ${validatedData.periodMonth}/${validatedData.periodYear}. Debe reemplazar el existente en su lugar.`
        );
    }

    // Guardar archivo
    const fileResult = await FileStorageService.saveFile(
        file,
        validatedData.teacherId,
        validatedData.periodYear,
        validatedData.periodMonth
    );

    // Crear recibo en base de datos
    const payslip = await prisma.payslip.create({
        data: {
            teacherId: validatedData.teacherId,
            periodMonth: validatedData.periodMonth,
            periodYear: validatedData.periodYear,
            amount: validatedData.amount,
            status: validatedData.status,
            notes: validatedData.notes,
            fileKey: fileResult.key,
            fileSize: fileResult.fileSize,
            mimeType: fileResult.mimeType,
            originalFileName: file.name,
            uploadedBy
        },
        include: {
            teacher: {
                include: {
                    user: true
                }
            }
        }
    });

    return payslip;
}

/**
 * Actualiza un recibo existente
 */
export async function updatePayslip(id: string, data: UpdatePayslipInput) {
    const validatedData = PayslipValidator.validateUpdateInput(data);

    const payslip = await prisma.payslip.update({
        where: { id },
        data: validatedData,
        include: {
            teacher: {
                include: {
                    user: true
                }
            }
        }
    });

    return payslip;
}

/**
 * Reemplaza el archivo PDF de un recibo existente
 */
export async function replacePayslipFile(id: string, file: File, uploadedBy: string) {
    const payslip = await getPayslipById(id);

    if (!payslip) {
        throw new Error('Recibo no encontrado');
    }

    if (payslip.deletedAt) {
        throw new Error('No se puede modificar un recibo eliminado');
    }

    // Eliminar archivo anterior si existe
    if (payslip.fileKey) {
        await FileStorageService.deleteFile(payslip.fileKey);
    }

    // Guardar nuevo archivo
    const fileResult = await FileStorageService.saveFile(
        file,
        payslip.teacherId,
        payslip.periodYear,
        payslip.periodMonth
    );

    // Actualizar recibo
    const updated = await prisma.payslip.update({
        where: { id },
        data: {
            fileKey: fileResult.key,
            fileSize: fileResult.fileSize,
            mimeType: fileResult.mimeType,
            originalFileName: file.name,
            uploadedBy,
            updatedAt: new Date()
        },
        include: {
            teacher: {
                include: {
                    user: true
                }
            }
        }
    });

    return updated;
}

/**
 * Elimina lógicamente un recibo
 */
export async function deletePayslip(id: string, deletedBy: string) {
    const payslip = await getPayslipById(id);

    if (!payslip) {
        throw new Error('Recibo no encontrado');
    }

    if (payslip.deletedAt) {
        throw new Error('El recibo ya está eliminado');
    }

    // Eliminar archivo físico
    if (payslip.fileKey) {
        await FileStorageService.deleteFile(payslip.fileKey);
    }

    // Eliminación lógica
    const deleted = await prisma.payslip.update({
        where: { id },
        data: {
            deletedAt: new Date(),
            deletedBy,
            fileKey: null,
            fileSize: null,
            mimeType: null
        }
    });

    return deleted;
}

/**
 * Obtiene docentes activos para el selector
 */
export async function getActiveTeachers() {
    return prisma.teacher.findMany({
        where: {
            status: 'ACTIVE'
        },
        include: {
            user: {
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true
                }
            }
        },
        orderBy: {
            user: {
                lastName: 'asc'
            }
        }
    });
}