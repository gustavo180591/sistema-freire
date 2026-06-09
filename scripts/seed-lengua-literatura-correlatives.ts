import {
	PrismaClient,
	AccreditationMode,
	SubjectType,
	TrainingField,
	CorrelativeType
} from '@prisma/client';

const prisma = new PrismaClient();

function splitCorrelatives(value?: string | null) {
	if (!value) return [];
	return value
		.split(' - ')
		.map((v) => v.trim())
		.filter(Boolean);
}

// Mapeo de nombres inconsistentes a nombres exactos del array subjects
const nameMapping: Record<string, string> = {
	'Teoría y Análisis Literario': 'Teoría y Análisis Literarios',
	'T.O.L.E.': 'Taller de Oralidad, Lectura y Escritura',
	'Didáctica General': 'Didáctica General*',
	'Sujeto de la Educación Secundaria': 'Sujetos de le Educación Secundaria',
	'Sujetos de la Educación Secundaria': 'Sujetos de le Educación Secundaria',
	'Didáctica de la Lengua y de la Literatura I': 'Didáctica de la Lengua y la Literatura I',
	'Didáctica de la Lengua y de la Literatura II': 'Didáctica de la Lengua y la Literatura II',
	'EDI I': 'EDI I: Taller de Ciudadanía',
	'EDI II': 'EDI II: Taller de Expresión corporal y Uso Apropiado de la voz',
	'EDI III': 'EDI III: Derecho Laboral Docente y Seguridad Social',
	'Historia del Arte y de la Literatura': 'Historia del Arte y la Literatura',
	'Didáctida de la Lengua y de la Literatura I': 'Didáctica de la Lengua y la Literatura I',
	'Literatura Española (2)': 'Literatura Española',
	'Historia y Política de la Educación Argentina': 'Historia y Política de la Eduación Argentina',
	'Literatura para Jóvenes': 'Literatura para Jóvenes*',
	'Práctica I': 'Práctica I.',
	'Gramática II': 'Gramática II*',
	'Didáctica de la Lengua y la Literatura II': 'Didáctica de la Lengua y la Literatura II'
};

async function main() {
	const career = await prisma.career.upsert({
		where: { code: 'LENGUA_LITERATURA' },
		update: {},
		create: {
			code: 'LENGUA_LITERATURA',
			name: 'Profesorado de Lengua y Literatura',
			trainingField: TrainingField.ESPECIFICA,
			durationYears: 4,
			active: true
		}
	});

	const subjects = [
		{
			code: 'TALLER_DE_ORALIDAD_LECTURA_Y_ESCRITURA',
			name: 'Taller de Oralidad, Lectura y Escritura',
			yearLevel: 1,
			subjectType: 'CAREER_SPECIFIC',
			trainingField: 'ESPECIFICA',
			accreditationMode: 'PROMOCIONAL',
			regularized: '',
			approved: '',
			approvedToPass: ''
		},
		{
			code: 'FILOSOFIA',
			name: 'Filosofía',
			yearLevel: 1,
			subjectType: 'CAREER_SPECIFIC',
			trainingField: 'ESPECIFICA',
			accreditationMode: 'EXAMEN_FINAL',
			regularized: '',
			approved: '',
			approvedToPass: ''
		},
		{
			code: 'PEDAGOGIA',
			name: 'Pedagogía',
			yearLevel: 1,
			subjectType: 'CAREER_SPECIFIC',
			trainingField: 'ESPECIFICA',
			accreditationMode: 'EXAMEN_FINAL',
			regularized: '',
			approved: '',
			approvedToPass: ''
		},
		{
			code: 'LITERATURA_PARA_JOVENES',
			name: 'Literatura para Jóvenes*',
			yearLevel: 1,
			subjectType: 'CAREER_SPECIFIC',
			trainingField: 'ESPECIFICA',
			accreditationMode: 'PROMOCIONAL',
			regularized: '',
			approved: '',
			approvedToPass: ''
		},
		{
			code: 'TEORIA_Y_ANALISIS_LITERARIOS',
			name: 'Teoría y Análisis Literarios',
			yearLevel: 1,
			subjectType: 'CAREER_SPECIFIC',
			trainingField: 'ESPECIFICA',
			accreditationMode: 'EXAMEN_FINAL',
			regularized: '',
			approved: '',
			approvedToPass: ''
		},
		{
			code: 'HISTORIA_DEL_ARTE_Y_LA_LITERATURA',
			name: 'Historia del Arte y la Literatura',
			yearLevel: 1,
			subjectType: 'CAREER_SPECIFIC',
			trainingField: 'ESPECIFICA',
			accreditationMode: 'EXAMEN_FINAL',
			regularized: '',
			approved: '',
			approvedToPass: ''
		},
		{
			code: 'GRAMATICA_I',
			name: 'Gramática I',
			yearLevel: 1,
			subjectType: 'CAREER_SPECIFIC',
			trainingField: 'ESPECIFICA',
			accreditationMode: 'EXAMEN_FINAL',
			regularized: '',
			approved: '',
			approvedToPass: ''
		},
		{
			code: 'PRACTICA_I',
			name: 'Práctica I.',
			yearLevel: 1,
			subjectType: 'CAREER_SPECIFIC',
			trainingField: 'PRACTICA',
			accreditationMode: 'PROMOCIONAL_SIN_FINAL',
			regularized: '',
			approved: '',
			approvedToPass: ''
		},
		{
			code: 'EDI_I_TALLER_DE_CIUDADANIA',
			name: 'EDI I: Taller de Ciudadanía',
			yearLevel: 1,
			subjectType: 'EDI',
			trainingField: 'EDI',
			accreditationMode: 'PROMOCIONAL',
			regularized: '',
			approved: '',
			approvedToPass: ''
		},
		{
			code: 'TIC',
			name: 'TIC',
			yearLevel: 2,
			subjectType: 'CAREER_SPECIFIC',
			trainingField: 'ESPECIFICA',
			accreditationMode: 'PROMOCIONAL',
			regularized: '',
			approved: '',
			approvedToPass: ''
		},
		{
			code: 'DIDACTICA_GENERAL',
			name: 'Didáctica General*',
			yearLevel: 2,
			subjectType: 'CAREER_SPECIFIC',
			trainingField: 'ESPECIFICA',
			accreditationMode: 'EXAMEN_FINAL',
			regularized: 'Pedagogía',
			approved: '',
			approvedToPass: 'Pedagogía'
		},
		{
			code: 'PSICOLOGIA_EDUCACIONAL',
			name: 'Psicología Educacional',
			yearLevel: 2,
			subjectType: 'CAREER_SPECIFIC',
			trainingField: 'ESPECIFICA',
			accreditationMode: 'PROMOCIONAL',
			regularized: 'Pedagogía',
			approved: '',
			approvedToPass: 'Pedagogía'
		},
		{
			code: 'SUJETOS_DE_LE_EDUCACION_SECUNDARIA',
			name: 'Sujetos de le Educación Secundaria',
			yearLevel: 2,
			subjectType: 'CAREER_SPECIFIC',
			trainingField: 'ESPECIFICA',
			accreditationMode: 'PROMOCIONAL',
			regularized: 'Pedagogía',
			approved: '',
			approvedToPass: 'Pedagogía'
		},
		{
			code: 'SEMIOTICA_Y_ANALISIS_DEL_DISCURSO',
			name: 'Semiótica y Análisis del Discurso',
			yearLevel: 2,
			subjectType: 'CAREER_SPECIFIC',
			trainingField: 'ESPECIFICA',
			accreditationMode: 'EXAMEN_FINAL',
			regularized: 'Taller de Oralidad, Lectura y Escritura',
			approved: '',
			approvedToPass: ''
		},
		{
			code: 'LITERATURA_ESPANOLA',
			name: 'Literatura Española',
			yearLevel: 2,
			subjectType: 'CAREER_SPECIFIC',
			trainingField: 'ESPECIFICA',
			accreditationMode: 'EXAMEN_FINAL',
			regularized: 'Teoría y Análisis Literario - Historia del Arte y la Literatura',
			approved: '',
			approvedToPass: 'Teoría y Análisis Literario'
		},
		{
			code: 'GRAMATICA_II',
			name: 'Gramática II*',
			yearLevel: 2,
			subjectType: 'CAREER_SPECIFIC',
			trainingField: 'ESPECIFICA',
			accreditationMode: 'EXAMEN_FINAL',
			regularized: 'Gramática I - T.O.L.E.',
			approved: '',
			approvedToPass: 'Gramática I - T.O.L.E.'
		},
		{
			code: 'DIDACTICA_DE_LA_LENGUA_Y_LA_LITERATURA_I',
			name: 'Didáctica de la Lengua y la Literatura I',
			yearLevel: 2,
			subjectType: 'CAREER_SPECIFIC',
			trainingField: 'ESPECIFICA',
			accreditationMode: 'EXAMEN_FINAL',
			regularized: 'Gramática I - Literatura para Jóvenes - Pedagogía - T.O.L.E.',
			approved: '',
			approvedToPass: 'Pedagogía - T.O.L.E. - Didáctica General'
		},
		{
			code: 'PRACTICA_II',
			name: 'Práctica II',
			yearLevel: 2,
			subjectType: 'CAREER_SPECIFIC',
			trainingField: 'PRACTICA',
			accreditationMode: 'PROMOCIONAL_SIN_FINAL',
			regularized: 'Práctica I - Pedagogía - Literatura para Jóvenes',
			approved: '',
			approvedToPass: 'Práctica I'
		},
		{
			code: 'EDI_II_TALLER_DE_EXPRESION_CORPORAL_Y_USO_APROPIADO_DE_LA_VOZ',
			name: 'EDI II: Taller de Expresión corporal y Uso Apropiado de la voz',
			yearLevel: 2,
			subjectType: 'EDI',
			trainingField: 'EDI',
			accreditationMode: 'PROMOCIONAL',
			regularized: 'EDI I - T.O.L.E.',
			approved: '',
			approvedToPass: ''
		},
		{
			code: 'HISTORIA_Y_POLITICA_DE_LA_EDUACION_ARGENTINA',
			name: 'Historia y Política de la Eduación Argentina',
			yearLevel: 3,
			subjectType: 'CAREER_SPECIFIC',
			trainingField: 'ESPECIFICA',
			accreditationMode: 'EXAMEN_FINAL',
			regularized: 'Filosofía - Pedagogía',
			approved: '',
			approvedToPass: 'Filosofía - Pedagogía'
		},
		{
			code: 'SOCIOLOGIA_DE_LA_EDUCACION',
			name: 'Sociología de la Educación',
			yearLevel: 3,
			subjectType: 'CAREER_SPECIFIC',
			trainingField: 'ESPECIFICA',
			accreditationMode: 'PROMOCIONAL',
			regularized: 'Sujeto de la Educación Secundaria',
			approved: 'Pedagogía',
			approvedToPass: ''
		},
		{
			code: 'LENGUA_Y_LITERATURA_GRECOLATINA',
			name: 'Lengua y Literatura Grecolatina',
			yearLevel: 3,
			subjectType: 'CAREER_SPECIFIC',
			trainingField: 'ESPECIFICA',
			accreditationMode: 'PROMOCIONAL',
			regularized: 'Gramática II',
			approved: 'Gramática I - Teoría y Análisis Literario - Historia del Arte y la Literatura',
			approvedToPass: ''
		},
		{
			code: 'LINGUISTICA_I',
			name: 'Lingüística I',
			yearLevel: 3,
			subjectType: 'CAREER_SPECIFIC',
			trainingField: 'ESPECIFICA',
			accreditationMode: 'EXAMEN_FINAL',
			regularized: 'Semiótica y Análisis del Discurso - Gramática II',
			approved: 'Gramática I - T.O.L.E.',
			approvedToPass: 'Semiótica y Análisis del Discurso - Gramática II - Filosofía'
		},
		{
			code: 'LITERATURA_ARGENTINA_I',
			name: 'Literatura Argentina I',
			yearLevel: 3,
			subjectType: 'CAREER_SPECIFIC',
			trainingField: 'ESPECIFICA',
			accreditationMode: 'EXAMEN_FINAL',
			regularized: 'Historia del Arte y la Literatura',
			approved: '',
			approvedToPass:
				'Teoría y Análisis Literario - Literatura para Jóvenes - Historia del Arte y de la Literatura - Semiótica y Análisis del Discurso'
		},
		{
			code: 'LITERATURA_LATINOAMERICANA',
			name: 'Literatura Latinoamericana',
			yearLevel: 3,
			subjectType: 'CAREER_SPECIFIC',
			trainingField: 'ESPECIFICA',
			accreditationMode: 'EXAMEN_FINAL',
			regularized: 'Historia del Arte y la Literatura',
			approved: '',
			approvedToPass:
				'Teoría y Análisis Literario - Historia del Arte y de la Literatura - Semiótica y Análisis del Discurso'
		},
		{
			code: 'DIDACTICA_DE_LA_LENGUA_Y_LA_LITERATURA_II',
			name: 'Didáctica de la Lengua y la Literatura II',
			yearLevel: 3,
			subjectType: 'CAREER_SPECIFIC',
			trainingField: 'ESPECIFICA',
			accreditationMode: 'EXAMEN_FINAL',
			regularized:
				'Didáctica General - Didáctica de la Lengua y de la Literatura I - Gramática II - Sujetos de la Educación Secundaria',
			approved: 'Teoría y Análisis Literario - Gramática I - Literatura para Jóvenes',
			approvedToPass:
				'Didáctica General - Didáctica de la Lengua y de la Literatura I - Gramática II - Sujetos de la Educación Secundaria'
		},
		{
			code: 'PRACTICA_III',
			name: 'Práctica III',
			yearLevel: 3,
			subjectType: 'CAREER_SPECIFIC',
			trainingField: 'PRACTICA',
			accreditationMode: 'PROMOCIONAL_SIN_FINAL',
			regularized:
				'Sujetos de la Educación Secundaria - Didáctida de la Lengua y de la Literatura I - Práctica II - Gramática II - Literatura Española - Semiótica y Análisis del Discurso - Didáctica General - Psicología Educacional',
			approved: 'Práctica I - Teoría y Análisis Literario - Gramática I - (2)',
			approvedToPass: 'Didáctica de la Lengua y de la Literatura I - Práctica II'
		},
		{
			code: 'EDI_III_DERECHO_LABORAL_DOCENTE_Y_SEGURIDAD_SOCIAL',
			name: 'EDI III: Derecho Laboral Docente y Seguridad Social',
			yearLevel: 3,
			subjectType: 'EDI',
			trainingField: 'EDI',
			accreditationMode: 'EXAMEN_FINAL',
			regularized: 'EDI II',
			approved: 'EDI I',
			approvedToPass: ''
		},
		{
			code: 'EDUCACION_SEXUAL_INTEGRAL',
			name: 'Educación Sexual Integral',
			yearLevel: 4,
			subjectType: 'CAREER_SPECIFIC',
			trainingField: 'ESPECIFICA',
			accreditationMode: 'PROMOCIONAL',
			regularized: 'Sujeto de la Educación Secundaria',
			approved: 'Psicología Educacional',
			approvedToPass: ''
		},
		{
			code: 'FORMACION_ETICA_Y_CIUDADANA',
			name: 'Formación Ética y Ciudadana',
			yearLevel: 4,
			subjectType: 'CAREER_SPECIFIC',
			trainingField: 'ESPECIFICA',
			accreditationMode: 'PROMOCIONAL',
			regularized: 'Sociología de la Educación',
			approved: '',
			approvedToPass: 'Sociología de la Educación'
		},
		{
			code: 'LINGUISTICA_II',
			name: 'Lingüística II',
			yearLevel: 4,
			subjectType: 'CAREER_SPECIFIC',
			trainingField: 'ESPECIFICA',
			accreditationMode: 'EXAMEN_FINAL',
			regularized: 'Lingüística I',
			approved: 'Gramática II',
			approvedToPass: 'Lingüística I'
		},
		{
			code: 'LITERATURA_ARGENTINA_II',
			name: 'Literatura Argentina II',
			yearLevel: 4,
			subjectType: 'CAREER_SPECIFIC',
			trainingField: 'ESPECIFICA',
			accreditationMode: 'EXAMEN_FINAL',
			regularized: 'Literatura Argentina I - Teoría y Análisis Literario',
			approved: '',
			approvedToPass: 'Literatura Argentina I'
		},
		{
			code: 'LITERATURA_UNIVERSAL',
			name: 'Literatura Universal',
			yearLevel: 4,
			subjectType: 'CAREER_SPECIFIC',
			trainingField: 'ESPECIFICA',
			accreditationMode: 'EXAMEN_FINAL',
			regularized:
				'Lengua y Literatura Grecolatina - Literatura Latinoamericana - Teoría y Análisis Literario - Literatura Argentina I',
			approved: 'Literatura Española',
			approvedToPass: 'Lengua y Literatura Grecolatina - Literatura Latinoamericana'
		},
		{
			code: 'RESIDENCIA_PEDAGOGICA',
			name: 'Residencia Pedagógica',
			yearLevel: 4,
			subjectType: 'CAREER_SPECIFIC',
			trainingField: 'ESPECIFICA',
			accreditationMode: 'PROMOCIONAL_SIN_FINAL',
			regularized:
				'Didáctica de la Lengua y de la Literatura II - Lingüística I - Literatura Argentina I - Literatura Latinoamericana - Literatura Española (2)',
			approved:
				'Sujeto de la Educación Secundaria - Psicología Educacional - Práctica III - Gramática II',
			approvedToPass: ''
		},
		{
			code: 'EDI_IV_INVESTIGACION_ACCION',
			name: 'EDI IV: Investigación - Acción',
			yearLevel: 4,
			subjectType: 'EDI',
			trainingField: 'EDI',
			accreditationMode: 'EXAMEN_FINAL',
			regularized:
				'EDI III - Historia y Política de la Educación Argentina - Sociología de la Educación',
			approved: '',
			approvedToPass: 'Historia y Política de la Educación Argentina - Sociología de la Educación'
		},
		{
			code: 'ESPACIOS_CURRICULARES_ANUALIZADOS_ALGUNOS_REQUIEREN_MODIFICACIONES_EN_EL_REGIMEN_DE_CORRELATIVIDADES_OBSERVAR_LAS_NOTAS_AL_PIE',
			name: '* Espacios curriculares anualizados. Algunos requieren modificaciones en el régimen de correlatividades. Observar las notas al pie.',
			yearLevel: 4,
			subjectType: 'CAREER_SPECIFIC',
			trainingField: 'ESPECIFICA',
			accreditationMode: 'EXAMEN_FINAL',
			regularized: '',
			approved: '',
			approvedToPass: ''
		},
		{
			code: '1_SE_MODIFICA_EL_CUADRO_SEGUN_LA_RESOLUCION_ELIMINANDO_DIDACTICA_GENERAL_POR_CONSIDERARSE_QUE_NO_PUEDE_TENERSE_DOBLE_CONDICION_REGULAR_Y_APROBADO_EN_UN_MISMO_PERIODO',
			name: '1) Se modifica el cuadro según la resolución, eliminando "Didáctica General" por considerarse que no puede tenerse doble condición (regular y aprobado) en un mismo periodo.',
			yearLevel: 4,
			subjectType: 'CAREER_SPECIFIC',
			trainingField: 'ESPECIFICA',
			accreditationMode: 'EXAMEN_FINAL',
			regularized: '',
			approved: '',
			approvedToPass: ''
		},
		{
			code: '2_SE_SUGIERE_QUE_EN_CONSONANCIA_CON_LITERATURA_UNIVERSAL_SE_DEBA_APROBAR',
			name: '2) Se sugiere que en consonancia con Literatura Universal se deba aprobar',
			yearLevel: 4,
			subjectType: 'CAREER_SPECIFIC',
			trainingField: 'ESPECIFICA',
			accreditationMode: 'EXAMEN_FINAL',
			regularized: '',
			approved: '',
			approvedToPass: ''
		}
	];

	const subjectCache = new Map<string, string>();

	for (const item of subjects) {
		const subject = await prisma.subject.upsert({
			where: { code: item.code },
			update: {
				name: item.name,
				yearLevel: item.yearLevel,
				accreditationMode: item.accreditationMode as AccreditationMode
			},
			create: {
				code: item.code,
				name: item.name,
				yearLevel: item.yearLevel,
				accreditationMode: item.accreditationMode as AccreditationMode,
				subjectType: item.subjectType as SubjectType,
				trainingField: item.trainingField as TrainingField,
				active: true
			}
		});

		// Guardar el nombre en el cache
		subjectCache.set(item.name, subject.id);

		await prisma.careerSubject.upsert({
			where: {
				careerId_subjectId: {
					careerId: career.id,
					subjectId: subject.id
				}
			},
			update: {
				yearLevel: item.yearLevel
			},
			create: {
				careerId: career.id,
				subjectId: subject.id,
				yearLevel: item.yearLevel,
				isMandatory: true
			}
		});
	}

	for (const item of subjects) {
		const subjectId = subjectCache.get(item.name);
		if (!subjectId) continue;

		const correlationGroups = [
			{ value: item.regularized, type: CorrelativeType.REGULAR },
			{ value: item.approved, type: CorrelativeType.APROBADO },
			{ value: item.approvedToPass, type: CorrelativeType.APROBADO_APROBAR }
		];

		for (const group of correlationGroups) {
			const correlatives = splitCorrelatives(group.value);

			for (const correlativeName of correlatives) {
				// Buscar en el mapeo primero
				const mappedName = nameMapping[correlativeName] || correlativeName;

				// Buscar primero con el nombre mapeado, luego con el original
				let requiredSubjectId = subjectCache.get(mappedName);
				if (!requiredSubjectId) {
					requiredSubjectId = subjectCache.get(correlativeName);
				}

				if (!requiredSubjectId) {
					console.warn(
						`Materia correlativa no encontrada: ${correlativeName} (mapeado: ${mappedName})`
					);
					continue;
				}

				await prisma.subjectCorrelative.upsert({
					where: {
						subjectId_requiredSubjectId_careerId: {
							subjectId,
							requiredSubjectId,
							careerId: career.id
						}
					},
					update: {
						correlativeType: group.type
					},
					create: {
						subjectId,
						requiredSubjectId,
						careerId: career.id,
						correlativeType: group.type
					}
				});
			}
		}
	}

	console.log('Seed Lengua y Literatura completado');
}

main()
	.catch((e) => {
		console.error(e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
