import { PrismaClient, RegularityStatus, ChargeStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
	console.log('🌱 Iniciando seed de historial académico y financiero...\n');

	const defaultPassword = await bcrypt.hash('password123', 10);

	// 1. Obtener o crear carrera de Lengua en Alem
	const career = await prisma.career.upsert({
		where: { code: 'LENGUA_ALEM' },
		update: {},
		create: {
			code: 'LENGUA_ALEM',
			name: 'Profesorado de Lengua y Literatura (Alem)',
			active: true
		}
	});
	console.log(`✅ Carrera: ${career.name}`);

	// 2. Crear materias de Lengua para todos los años
	const materiasLengua = [
		// 1er Año
		{ name: 'Gramática Castellana I', code: 'LEN_GRAM_I', yearLevel: 1 },
		{ name: 'Literatura Argentina y Latinoamericana', code: 'LEN_LIT_LAT', yearLevel: 1 },
		{ name: 'Historia de la Lengua', code: 'LEN_HIST_LENG', yearLevel: 1 },
		{ name: 'Lectura y Escritura Académica', code: 'LEN_LEC_ESC', yearLevel: 1 },
		{ name: 'Didáctica de la Lengua I', code: 'LEN_DID_I', yearLevel: 1 },
		// 2do Año
		{ name: 'Gramática Castellana II', code: 'LEN_GRAM_II', yearLevel: 2 },
		{ name: 'Literatura Española', code: 'LEN_LIT_ESP', yearLevel: 2 },
		{ name: 'Teoría Literaria', code: 'LEN_TEORIA_LIT', yearLevel: 2 },
		{ name: 'Filología e Historiografía', code: 'LEN_FILO', yearLevel: 2 },
		{ name: 'Didáctica de la Lengua II', code: 'LEN_DID_II', yearLevel: 2 },
		// 3er Año
		{ name: 'Literatura Comparada', code: 'LEN_LIT_COMP', yearLevel: 3 },
		{ name: 'Análisis del Discurso', code: 'LEN_ANAL_DISC', yearLevel: 3 },
		{ name: 'Sociolingüística', code: 'LEN_SOCIOLING', yearLevel: 3 },
		{ name: 'Psicolingüística', code: 'LEN_PSICOLING', yearLevel: 3 },
		{ name: 'Didáctica de la Lengua III', code: 'LEN_DID_III', yearLevel: 3 },
		// 4to Año
		{ name: 'Semántica y Pragmática', code: 'LEN_SEM_PRAG', yearLevel: 4 },
		{ name: 'Literatura Universal', code: 'LEN_LIT_UNIV', yearLevel: 4 },
		{ name: 'Producción de Textos Literarios', code: 'LEN_PROD_TEXT', yearLevel: 4 },
		{ name: 'Didáctica de la Lengua IV', code: 'LEN_DID_IV', yearLevel: 4 },
		{ name: 'Práctica Docente I', code: 'LEN_PRAC_I', yearLevel: 4 },
		{ name: 'Práctica Docente II', code: 'LEN_PRAC_II', yearLevel: 4 },
		{ name: 'Trabajo Final de Grado', code: 'LEN_TFG', yearLevel: 4 },
	];

	console.log('\n📚 Creando materias...');
	for (const mat of materiasLengua) {
		await prisma.subject.upsert({
			where: { code: mat.code },
			update: {},
			create: {
				code: mat.code,
				name: mat.name,
				yearLevel: mat.yearLevel,
				active: true
			}
		});
	}
	console.log(`✅ ${materiasLengua.length} materias creadas`);

	// 3. Obtener rol de alumno
	const alumnoRole = await prisma.role.findUnique({
		where: { code: 'ALUMNO' }
	});

	if (!alumnoRole) {
		throw new Error('Rol ALUMNO no encontrado. Ejecuta primero: npx prisma db seed -- --schema prisma/seed.ts');
	}

	// 4. Crear usuario y alumno de ejemplo
	const email = 'extra.becado.lenguaalem@instituto.edu';
	console.log(`\n👤 Creando alumno: ${email}`);

	// Buscar si ya existe el usuario
	let user = await prisma.user.findUnique({
		where: { email }
	});

	if (!user) {
		user = await prisma.user.create({
			data: {
				email,
				passwordHash: defaultPassword,
				firstName: 'Extra',
				lastName: 'Becado',
				status: 'ACTIVE',
				roles: {
					create: {
						roleId: alumnoRole.id
					}
				}
			}
		});
		console.log('✅ Usuario creado');
	} else {
		console.log('⚠️ Usuario ya existente');
	}

	// Buscar o crear el estudiante
	let student = await prisma.student.findUnique({
		where: { userId: user.id }
	});

	if (!student) {
		student = await prisma.student.create({
			data: {
				userId: user.id,
				dni: '34204837',
				firstName: 'Extra',
				lastName: 'Becado',
				careerId: career.id,
				currentYear: 1,
				isBecado: true,
				isRecursante: false,
				status: 'ACTIVE'
			}
		});
		console.log('✅ Estudiante creado');
	} else {
		console.log('⚠️ Estudiante ya existente');
	}

	console.log(`🎓 ID del estudiante: ${student.id}`);

	// 5. Crear estados de materias (StudentSubjectStatus) con datos variados
	console.log('\n📊 Creando historial académico...');

	const subjects = await prisma.subject.findMany({
		where: {
			code: { startsWith: 'LEN_' }
		}
	});

	// Definir estados para cada año
	const yearConfigs = [
		// 1er Año - Algunas aprobadas, algunas regulares, algunas libres
		{ year: 1, approved: 3, regular: 1, libre: 1 },
		// 2do Año - En curso (mix de estados)
		{ year: 2, approved: 1, regular: 2, libre: 2 },
		// 3er y 4to año - Sin datos aún
		{ year: 3, approved: 0, regular: 0, libre: 0 },
		{ year: 4, approved: 0, regular: 0, libre: 0 }
	];

	let createdStatuses = 0;

	for (const config of yearConfigs) {
		const yearSubjects = subjects.filter(s => s.yearLevel === config.year);
		
		let approvedCount = 0;
		let regularCount = 0;
		let libreCount = 0;

		for (const subject of yearSubjects) {
			// Determinar estado
			let status: RegularityStatus;
			let approved = false;
			let attendance = 0;

			if (approvedCount < config.approved) {
				status = 'REGULAR';
				approved = true;
				attendance = 85 + Math.floor(Math.random() * 15); // 85-100%
				approvedCount++;
			} else if (regularCount < config.regular) {
				status = 'REGULAR';
				approved = false;
				attendance = 70 + Math.floor(Math.random() * 15); // 70-85%
				regularCount++;
			} else if (libreCount < config.libre) {
				status = 'LIBRE';
				approved = false;
				attendance = 40 + Math.floor(Math.random() * 20); // 40-60%
				libreCount++;
			} else {
				// Sin datos aún para esta materia
				continue;
			}

			// Verificar si ya existe
			const existing = await prisma.studentSubjectStatus.findUnique({
				where: {
					studentId_subjectId: {
						studentId: student.id,
						subjectId: subject.id
					}
				}
			});

			if (!existing) {
				await prisma.studentSubjectStatus.create({
					data: {
						studentId: student.id,
						subjectId: subject.id,
						attendancePercent: attendance,
						regularityStatus: status,
						approved: approved
					}
				});
				createdStatuses++;
			}
		}
	}

	console.log(`✅ ${createdStatuses} estados de materias creados`);

	// 6. Crear conceptos de cargo
	console.log('\n💰 Creando conceptos de cargo...');
	const conceptos = [
		{ code: 'CUOTA_MENSUAL', name: 'Cuota Mensual' },
		{ code: 'MATRICULA', name: 'Matrícula Anual' },
		{ code: 'MATERIALES', name: 'Materiales de Estudio' },
		{ code: 'EXAMEN', name: 'Derecho de Examen' },
		{ code: 'PRACTICA', name: 'Práctica Docente' }
	];

	for (const concepto of conceptos) {
		await prisma.chargeConcept.upsert({
			where: { code: concepto.code },
			update: {},
			create: {
				code: concepto.code,
				name: concepto.name
			}
		});
	}
	console.log(`✅ ${conceptos.length} conceptos de cargo creados`);

	// 7. Crear cargos financieros (deudas)
	console.log('\n💳 Creando cargos financieros...');

	const cuotaConcept = await prisma.chargeConcept.findUnique({
		where: { code: 'CUOTA_MENSUAL' }
	});
	const matriculaConcept = await prisma.chargeConcept.findUnique({
		where: { code: 'MATRICULA' }
	});

	if (cuotaConcept && matriculaConcept) {
		// Matrícula pendiente
		const existingMatricula = await prisma.studentCharge.findFirst({
			where: {
				studentId: student.id,
				conceptId: matriculaConcept.id,
				periodLabel: '2025'
			}
		});

		if (!existingMatricula) {
			await prisma.studentCharge.create({
				data: {
					studentId: student.id,
					conceptId: matriculaConcept.id,
					periodLabel: '2025',
					amount: 50000,
					paidAmount: 0,
					status: 'PENDING',
					dueDate: new Date('2025-03-15')
				}
			});
			console.log('✅ Matrícula 2025 creada: $50,000');
		}

		// Cuotas mensuales pendientes (algunas pagadas parcialmente)
		const meses = ['Marzo', 'Abril', 'Mayo'];
		for (const mes of meses) {
			const existingCuota = await prisma.studentCharge.findFirst({
				where: {
					studentId: student.id,
					conceptId: cuotaConcept.id,
					periodLabel: `2025-${mes}`
				}
			});

			if (!existingCuota) {
				const pagado = mes === 'Marzo' ? 15000 : mes === 'Abril' ? 0 : 8000;
				const total = 30000;
				const estado = pagado === 0 ? 'PENDING' : pagado < total ? 'PARTIAL' : 'PAID';

				await prisma.studentCharge.create({
					data: {
						studentId: student.id,
						conceptId: cuotaConcept.id,
						periodLabel: `2025-${mes}`,
						amount: total,
						paidAmount: pagado,
						status: estado as ChargeStatus,
						dueDate: new Date(`2025-${mes === 'Marzo' ? '03' : mes === 'Abril' ? '04' : '05'}-10`)
					}
				});
				console.log(`✅ Cuota ${mes} creada: $${total} (Pagado: $${pagado})`);
			}
		}
	}

	// Calcular deuda total
	const totalDebt = await prisma.studentCharge.aggregate({
		where: {
			studentId: student.id,
			status: { in: ['PENDING', 'PARTIAL'] }
		},
		_sum: {
			amount: true,
			paidAmount: true
		}
	});

	const debt = Number(totalDebt._sum.amount || 0) - Number(totalDebt._sum.paidAmount || 0);

	console.log('\n📊 RESUMEN DEL HISTORIAL:');
	console.log('=' .repeat(50));
	console.log(`👤 Alumno: ${student.firstName} ${student.lastName}`);
	console.log(`🎓 Carrera: ${career.name}`);
	console.log(`📚 Materias en historial: ${createdStatuses}`);
	console.log(`✅ Aprobadas: ${yearConfigs.reduce((acc, y) => acc + y.approved, 0)}`);
	console.log(`📋 Regulares: ${yearConfigs.reduce((acc, y) => acc + y.regular, 0)}`);
	console.log(`⚠️ Libres: ${yearConfigs.reduce((acc, y) => acc + y.libre, 0)}`);
	console.log(`💰 Deuda total: $${debt.toLocaleString('es-AR')}`);
	console.log('=' .repeat(50));
	console.log('\n✅ Seed completado exitosamente!');
	console.log(`\n🔗 URL de historial: http://localhost:5174/alumnos/${student.id}/historial`);
}

main()
	.catch((e) => {
		console.error(e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
