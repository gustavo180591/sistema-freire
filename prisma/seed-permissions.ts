import { PrismaClient } from '@prisma/client';
import { ENTITIES, type Entity } from '../src/lib/server/auth/permissions-granular';

const prisma = new PrismaClient();

// Permisos por defecto para cada rol
const defaultPermissions = [
	// DIRECTOR - Puede todo excepto permisos (solo SUPERADMIN)
	{
		roleCode: 'DIRECTOR',
		entity: 'USER',
		canCreate: true,
		canRead: true,
		canUpdate: true,
		canDelete: true
	},
	{
		roleCode: 'DIRECTOR',
		entity: 'STUDENT',
		canCreate: true,
		canRead: true,
		canUpdate: true,
		canDelete: true
	},
	{
		roleCode: 'DIRECTOR',
		entity: 'TEACHER',
		canCreate: true,
		canRead: true,
		canUpdate: true,
		canDelete: true
	},
	{
		roleCode: 'DIRECTOR',
		entity: 'CAREER',
		canCreate: true,
		canRead: true,
		canUpdate: true,
		canDelete: true
	},
	{
		roleCode: 'DIRECTOR',
		entity: 'SUBJECT',
		canCreate: true,
		canRead: true,
		canUpdate: true,
		canDelete: true
	},
	{
		roleCode: 'DIRECTOR',
		entity: 'COMMISSION',
		canCreate: true,
		canRead: true,
		canUpdate: true,
		canDelete: true
	},
	{
		roleCode: 'DIRECTOR',
		entity: 'SUBJECT_COMMISSION',
		canCreate: true,
		canRead: true,
		canUpdate: true,
		canDelete: true
	},
	{
		roleCode: 'DIRECTOR',
		entity: 'ACADEMIC_TERM',
		canCreate: true,
		canRead: true,
		canUpdate: true,
		canDelete: true
	},
	{
		roleCode: 'DIRECTOR',
		entity: 'ENROLLMENT',
		canCreate: true,
		canRead: true,
		canUpdate: true,
		canDelete: true
	},
	{
		roleCode: 'DIRECTOR',
		entity: 'SUBJECT_ENROLLMENT',
		canCreate: true,
		canRead: true,
		canUpdate: true,
		canDelete: true
	},
	{
		roleCode: 'DIRECTOR',
		entity: 'STUDENT_CHARGE',
		canCreate: true,
		canRead: true,
		canUpdate: true,
		canDelete: true
	},
	{
		roleCode: 'DIRECTOR',
		entity: 'PAYMENT',
		canCreate: true,
		canRead: true,
		canUpdate: true,
		canDelete: true
	},
	{
		roleCode: 'DIRECTOR',
		entity: 'FINANCIAL_BLOCK',
		canCreate: true,
		canRead: true,
		canUpdate: true,
		canDelete: true
	},
	{
		roleCode: 'DIRECTOR',
		entity: 'FINANCIAL_REPORT',
		canCreate: false,
		canRead: true,
		canUpdate: false,
		canDelete: false
	},
	{
		roleCode: 'DIRECTOR',
		entity: 'PAYSLIP',
		canCreate: true,
		canRead: true,
		canUpdate: true,
		canDelete: true
	},
	{
		roleCode: 'DIRECTOR',
		entity: 'SCHOLARSHIP',
		canCreate: true,
		canRead: true,
		canUpdate: true,
		canDelete: true
	},
	{
		roleCode: 'DIRECTOR',
		entity: 'AUDIT_LOG',
		canCreate: false,
		canRead: true,
		canUpdate: false,
		canDelete: false
	},
	{
		roleCode: 'DIRECTOR',
		entity: 'PERMISSION',
		canCreate: false,
		canRead: true,
		canUpdate: false,
		canDelete: false
	},

	// SECRETARIA - Puede gestionar académico pero no finanzas
	{
		roleCode: 'SECRETARIA',
		entity: 'USER',
		canCreate: false,
		canRead: true,
		canUpdate: false,
		canDelete: false
	},
	{
		roleCode: 'SECRETARIA',
		entity: 'STUDENT',
		canCreate: true,
		canRead: true,
		canUpdate: true,
		canDelete: false
	},
	{
		roleCode: 'SECRETARIA',
		entity: 'TEACHER',
		canCreate: false,
		canRead: true,
		canUpdate: false,
		canDelete: false
	},
	{
		roleCode: 'SECRETARIA',
		entity: 'CAREER',
		canCreate: false,
		canRead: true,
		canUpdate: false,
		canDelete: false
	},
	{
		roleCode: 'SECRETARIA',
		entity: 'SUBJECT',
		canCreate: false,
		canRead: true,
		canUpdate: false,
		canDelete: false
	},
	{
		roleCode: 'SECRETARIA',
		entity: 'COMMISSION',
		canCreate: false,
		canRead: true,
		canUpdate: false,
		canDelete: false
	},
	{
		roleCode: 'SECRETARIA',
		entity: 'SUBJECT_COMMISSION',
		canCreate: false,
		canRead: true,
		canUpdate: false,
		canDelete: false
	},
	{
		roleCode: 'SECRETARIA',
		entity: 'ENROLLMENT',
		canCreate: true,
		canRead: true,
		canUpdate: true,
		canDelete: false
	},
	{
		roleCode: 'SECRETARIA',
		entity: 'SUBJECT_ENROLLMENT',
		canCreate: true,
		canRead: true,
		canUpdate: true,
		canDelete: false
	},

	// FINANZAS - Solo finanzas
	{
		roleCode: 'FINANZAS',
		entity: 'USER',
		canCreate: false,
		canRead: true,
		canUpdate: false,
		canDelete: false
	},
	{
		roleCode: 'FINANZAS',
		entity: 'STUDENT',
		canCreate: false,
		canRead: true,
		canUpdate: false,
		canDelete: false
	},
	{
		roleCode: 'FINANZAS',
		entity: 'STUDENT_CHARGE',
		canCreate: true,
		canRead: true,
		canUpdate: true,
		canDelete: false
	},
	{
		roleCode: 'FINANZAS',
		entity: 'PAYMENT',
		canCreate: true,
		canRead: true,
		canUpdate: true,
		canDelete: false
	},
	{
		roleCode: 'FINANZAS',
		entity: 'FINANCIAL_BLOCK',
		canCreate: true,
		canRead: true,
		canUpdate: true,
		canDelete: false
	},
	{
		roleCode: 'FINANZAS',
		entity: 'FINANCIAL_REPORT',
		canCreate: false,
		canRead: true,
		canUpdate: false,
		canDelete: false
	},
	{
		roleCode: 'FINANZAS',
		entity: 'PAYSLIP',
		canCreate: true,
		canRead: true,
		canUpdate: true,
		canDelete: false
	},
	{
		roleCode: 'FINANZAS',
		entity: 'SCHOLARSHIP',
		canCreate: false,
		canRead: true,
		canUpdate: false,
		canDelete: false
	},

	// LIQUIDADOR - Solo carga de recibos de sueldo
	{
		roleCode: 'LIQUIDADOR',
		entity: 'USER',
		canCreate: false,
		canRead: true,
		canUpdate: false,
		canDelete: false
	},
	{
		roleCode: 'LIQUIDADOR',
		entity: 'STUDENT',
		canCreate: false,
		canRead: false,
		canUpdate: false,
		canDelete: false
	},
	{
		roleCode: 'LIQUIDADOR',
		entity: 'TEACHER',
		canCreate: false,
		canRead: true,
		canUpdate: false,
		canDelete: false
	},
	{
		roleCode: 'LIQUIDADOR',
		entity: 'PAYSLIP',
		canCreate: true,
		canRead: true,
		canUpdate: true,
		canDelete: false
	},

	// DOCENTE - Solo lectura de lo académico
	{
		roleCode: 'DOCENTE',
		entity: 'STUDENT',
		canCreate: false,
		canRead: true,
		canUpdate: false,
		canDelete: false
	},
	{
		roleCode: 'DOCENTE',
		entity: 'COMMISSION',
		canCreate: false,
		canRead: true,
		canUpdate: false,
		canDelete: false
	},
	{
		roleCode: 'DOCENTE',
		entity: 'PAYSLIP',
		canCreate: false,
		canRead: true,
		canUpdate: false,
		canDelete: false
	},

	// ALUMNO - Solo ver sus datos y crear sus inscripciones
	{
		roleCode: 'ALUMNO',
		entity: 'STUDENT',
		canCreate: false,
		canRead: true,
		canUpdate: false,
		canDelete: false
	},
	{
		roleCode: 'ALUMNO',
		entity: 'SUBJECT_ENROLLMENT',
		canCreate: true,
		canRead: true,
		canUpdate: true,
		canDelete: false
	},

	// APODERADO - Similar a alumno
	{
		roleCode: 'APODERADO',
		entity: 'STUDENT',
		canCreate: false,
		canRead: true,
		canUpdate: false,
		canDelete: false
	},
	{
		roleCode: 'APODERADO',
		entity: 'PAYMENT',
		canCreate: false,
		canRead: true,
		canUpdate: false,
		canDelete: false
	},
	{
		roleCode: 'APODERADO',
		entity: 'STUDENT_CHARGE',
		canCreate: false,
		canRead: true,
		canUpdate: false,
		canDelete: false
	}
];

async function main() {
	console.log('🌱 Seeding permissions...');

	for (const perm of defaultPermissions) {
		await prisma.permission.upsert({
			where: {
				roleCode_entity: {
					roleCode: perm.roleCode as any,
					entity: perm.entity as Entity
				}
			},
			update: perm as any,
			create: perm as any
		});
	}

	console.log(`✅ Created/updated ${defaultPermissions.length} permissions`);
	console.log('✅ Permissions seed completed');
}

main()
	.catch((e) => {
		console.error(e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
