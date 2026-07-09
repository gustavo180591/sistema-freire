import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
	console.log('🌱 Iniciando seed de calendario...\n');

	// Crear configuración de días laborables
	console.log('⚙️ Creando configuración de días laborables...');
	await prisma.calendarConfig.upsert({
		where: { key: 'working_days' },
		update: {},
		create: {
			key: 'working_days',
			value: [1, 2, 3, 4, 5], // Lunes-Viernes
			description: 'Días laborables de la semana (0=Domingo, 6=Sábado)'
		}
	});
	console.log('✅ Días laborables configurados');

	// Crear feriados para 2026
	console.log('\n🎉 Creando feriados para 2026...');
	const feriados2026 = [
		{ name: 'Año Nuevo', date: '2026-01-01', recurring: true, description: 'Feriado nacional' },
		{ name: 'Carnaval', date: '2026-02-16', recurring: false, description: 'Feriado nacional' },
		{ name: 'Carnaval', date: '2026-02-17', recurring: false, description: 'Feriado nacional' },
		{
			name: 'Día Nacional de la Memoria',
			date: '2026-03-24',
			recurring: true,
			description: 'Feriado nacional'
		},
		{
			name: 'Día del Veterano',
			date: '2026-04-02',
			recurring: true,
			description: 'Feriado nacional'
		},
		{
			name: 'Viernes Santo',
			date: '2026-04-03',
			recurring: false,
			description: 'Feriado nacional'
		},
		{
			name: 'Día del Trabajador',
			date: '2026-05-01',
			recurring: true,
			description: 'Feriado nacional'
		},
		{
			name: 'Día de la Revolución',
			date: '2026-05-25',
			recurring: true,
			description: 'Feriado nacional'
		},
		{
			name: 'Paso a la Inmortalidad',
			date: '2026-06-17',
			recurring: true,
			description: 'Feriado nacional'
		},
		{
			name: 'Día de la Independencia',
			date: '2026-07-09',
			recurring: true,
			description: 'Feriado nacional'
		},
		{
			name: 'Paso a la Inmortalidad',
			date: '2026-08-17',
			recurring: true,
			description: 'Feriado nacional'
		},
		{
			name: 'Día del Respeto',
			date: '2026-10-12',
			recurring: true,
			description: 'Feriado nacional'
		},
		{
			name: 'Día de la Soberanía',
			date: '2026-11-20',
			recurring: false,
			description: 'Feriado nacional'
		},
		{
			name: 'Inmaculada Concepción',
			date: '2026-12-08',
			recurring: true,
			description: 'Feriado nacional'
		},
		{ name: 'Navidad', date: '2026-12-25', recurring: true, description: 'Feriado nacional' }
	];

	for (const feriado of feriados2026) {
		await prisma.holiday.upsert({
			where: {
				date_year: {
					date: new Date(feriado.date),
					year: 2026
				}
			},
			update: {},
			create: {
				name: feriado.name,
				date: new Date(feriado.date),
				year: 2026,
				recurring: feriado.recurring,
				description: feriado.description
			}
		});
	}
	console.log(`✅ ${feriados2026.length} feriados creados`);

	// Crear fechas importantes para 2026
	console.log('\n📅 Creando fechas importantes para 2026...');
	const fechasImportantes2026 = [
		{
			name: 'Inicio de clases',
			date: '2026-03-01',
			recurring: true,
			description: 'Primer día de clases'
		},
		{
			name: 'Fin de primer trimestre',
			date: '2026-05-31',
			recurring: true,
			description: 'Cierre de notas primer trimestre'
		},
		{
			name: 'Inicio de receso de invierno',
			date: '2026-07-10',
			recurring: true,
			description: 'Comienzo del receso'
		},
		{
			name: 'Fin de receso de invierno',
			date: '2026-07-31',
			recurring: true,
			description: 'Fin del receso'
		},
		{
			name: 'Fin de segundo trimestre',
			date: '2026-09-30',
			recurring: true,
			description: 'Cierre de notas segundo trimestre'
		},
		{
			name: 'Inicio de exámenes finales',
			date: '2026-11-15',
			recurring: true,
			description: 'Período de exámenes finales'
		},
		{
			name: 'Fin de exámenes finales',
			date: '2026-12-15',
			recurring: true,
			description: 'Cierre de exámenes finales'
		},
		{
			name: 'Fin de ciclo lectivo',
			date: '2026-12-20',
			recurring: true,
			description: 'Último día de clases'
		},
		{
			name: 'Acto de colación',
			date: '2026-12-22',
			recurring: true,
			description: 'Ceremonia de graduación'
		}
	];

	for (const fecha of fechasImportantes2026) {
		await prisma.importantDate.upsert({
			where: {
				date_year: {
					date: new Date(fecha.date),
					year: 2026
				}
			},
			update: {},
			create: {
				name: fecha.name,
				date: new Date(fecha.date),
				year: 2026,
				recurring: fecha.recurring,
				description: fecha.description
			}
		});
	}
	console.log(`✅ ${fechasImportantes2026.length} fechas importantes creadas`);

	console.log('\n📊 RESUMEN:');
	console.log(`   • Configuración de días laborables: 1`);
	console.log(`   • Feriados 2026: ${feriados2026.length}`);
	console.log(`   • Fechas importantes 2026: ${fechasImportantes2026.length}`);

	console.log('\n✅ Seed de calendario completado exitosamente!');
}

main()
	.catch((e) => {
		console.error('❌ Error:', e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
