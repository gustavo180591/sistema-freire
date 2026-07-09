import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
	console.log('🌱 Iniciando seed de documentos...\n');

	// Obtener alumnos
	const students = await prisma.student.findMany({ take: 10 });
	if (students.length === 0) {
		throw new Error('No hay alumnos. Ejecuta primero seed-alumnos-tipos.ts');
	}

	// Obtener usuarios
	const users = await prisma.user.findMany({ take: 5 });
	if (users.length === 0) {
		throw new Error('No hay usuarios. Ejecuta primero npx prisma db seed');
	}

	console.log(`👨‍🎓 Alumnos: ${students.length}`);
	console.log(`👤 Usuarios: ${users.length}`);

	// Crear documentos de alumnos
	console.log('\n📄 Creando documentos de alumnos...');
	let documentsCount = 0;

	const tiposDocumentos = [
		'DNI',
		'MEDICAL_CERTIFICATE',
		'PHOTO_ID',
		'CONSTANCY',
		'SECONDARY_TITLE'
	];

	for (const student of students) {
		const uploadedBy = users[Math.floor(Math.random() * users.length)];
		const verifiedBy = users[Math.floor(Math.random() * users.length)];

		// Crear 2-3 documentos por alumno
		const numDocuments = 2 + Math.floor(Math.random() * 2);

		for (let i = 0; i < numDocuments; i++) {
			const tipo = tiposDocumentos[i % tiposDocumentos.length];
			const isVerified = Math.random() > 0.3;

			await prisma.studentDocument.create({
				data: {
					studentId: student.id,
					type: tipo as any,
					name: `${tipo}_${student.dni}_${i + 1}.pdf`,
					fileUrl: `https://storage.example.com/documents/${student.id}/${tipo}_${i + 1}.pdf`,
					fileSize: 1024000,
					mimeType: 'application/pdf',
					uploadedBy: uploadedBy.id,
					verified: isVerified,
					verifiedBy: isVerified ? verifiedBy.id : null,
					verifiedAt: isVerified ? new Date() : null,
					notes: tipo === 'DNI' ? 'Documento de identidad' : 'Documentación complementaria'
				}
			});

			documentsCount++;
		}

		console.log(`✅ Documentos creados para alumno: ${student.firstName} ${student.lastName}`);
	}

	console.log('\n📊 RESUMEN:');
	console.log(`   • Documentos creados: ${documentsCount}`);

	console.log('\n✅ Seed de documentos completado exitosamente!');
}

main()
	.catch((e) => {
		console.error('❌ Error:', e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
