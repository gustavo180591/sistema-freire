import { prisma } from '$lib/server/db/prisma';

export type TeacherAttendanceStudent = {
	id: string;
	enrollmentId: string;
	dni: string;
	firstName: string;
	lastName: string;
	career: string;
	currentYear: number;
};

export type TeacherAttendanceSubject = {
	id: string;
	code: string;
	name: string;
	assignmentType: 'TITULAR' | 'SUPLENTE';
};

export type TeacherAttendanceScope = {
	key: string;
	subjectId: string;
	subjectCode: string;
	subjectName: string;
	commissionId: string | null;
	commissionCode: string | null;
	locationId: string | null;
	locationName: string | null;
	label: string;
	students: TeacherAttendanceStudent[];
};

export type TeacherAttendanceContext = {
	subjects: TeacherAttendanceSubject[];
	scopes: TeacherAttendanceScope[];
};

function toAttendanceStudent(enrollment: {
	id: string;
	student: {
		id: string;
		dni: string;
		firstName: string;
		lastName: string;
		currentYear: number;
		career: {
			name: string;
		};
	};
}): TeacherAttendanceStudent {
	return {
		id: enrollment.student.id,
		enrollmentId: enrollment.id,
		dni: enrollment.student.dni,
		firstName: enrollment.student.firstName,
		lastName: enrollment.student.lastName,
		career: enrollment.student.career.name,
		currentYear: enrollment.student.currentYear
	};
}

function sortStudents(students: TeacherAttendanceStudent[]): TeacherAttendanceStudent[] {
	return students.sort((a, b) => {
		const lastNameComparison = a.lastName.localeCompare(b.lastName, 'es');

		if (lastNameComparison !== 0) {
			return lastNameComparison;
		}

		return a.firstName.localeCompare(b.firstName, 'es');
	});
}

/**
 * Resuelve los grupos sobre los que un docente puede registrar asistencia.
 *
 * Reglas:
 * - SubjectTeacher habilita al docente sobre la materia.
 * - Las comisiones asignadas al docente permanecen separadas.
 * - Los alumnos con inscripción activa y sin comisión forman grupos
 *   separados por materia y localidad.
 * - Nunca se incorporan comisiones pertenecientes a otro docente.
 */
export async function getTeacherAttendanceContext(
	teacherId: string,
	allowedLocationIds: string[]
): Promise<TeacherAttendanceContext> {
	const assignments = await prisma.subjectTeacher.findMany({
		where: {
			teacherId,
			subject: {
				active: true
			}
		},
		select: {
			assignmentType: true,
			subjectId: true,
			subject: {
				select: {
					id: true,
					code: true,
					name: true
				}
			}
		},
		orderBy: {
			subject: {
				name: 'asc'
			}
		}
	});

	const subjects: TeacherAttendanceSubject[] = assignments.map((assignment) => ({
		id: assignment.subject.id,
		code: assignment.subject.code,
		name: assignment.subject.name,
		assignmentType: assignment.assignmentType
	}));

	const subjectIds = assignments.map((assignment) => assignment.subjectId);

	if (subjectIds.length === 0) {
		return {
			subjects,
			scopes: []
		};
	}

	const commissions = await prisma.subjectCommission.findMany({
		where: {
			teacherId,
			active: true,
			subjectId: {
				in: subjectIds
			},
			OR: [
				{
					locationId: null
				},
				{
					locationId: {
						in: allowedLocationIds
					}
				}
			]
		},
		select: {
			id: true,
			code: true,
			subjectId: true,
			locationId: true,
			subject: {
				select: {
					code: true,
					name: true
				}
			},
			location: {
				select: {
					id: true,
					name: true
				}
			},
			enrollments: {
				where: {
					status: 'ACTIVE',
					student: {
						status: 'ACTIVE'
					}
				},
				select: {
					id: true,
					student: {
						select: {
							id: true,
							dni: true,
							firstName: true,
							lastName: true,
							currentYear: true,
							career: {
								select: {
									name: true
								}
							}
						}
					}
				}
			}
		},
		orderBy: [{ subject: { name: 'asc' } }, { code: 'asc' }]
	});

	const commissionScopes: TeacherAttendanceScope[] = commissions.map((commission) => {
		const studentsById = new Map<string, TeacherAttendanceStudent>();

		for (const enrollment of commission.enrollments) {
			if (!studentsById.has(enrollment.student.id)) {
				studentsById.set(enrollment.student.id, toAttendanceStudent(enrollment));
			}
		}

		return {
			key: `commission:${commission.id}`,
			subjectId: commission.subjectId,
			subjectCode: commission.subject.code,
			subjectName: commission.subject.name,
			commissionId: commission.id,
			commissionCode: commission.code,
			locationId: commission.locationId,
			locationName: commission.location?.name ?? null,
			label: commission.location
				? `${commission.code} · ${commission.location.name}`
				: commission.code,
			students: sortStudents(Array.from(studentsById.values()))
		};
	});

	/*
	 * Inscripciones activas que todavía no tienen comisión.
	 *
	 * Para no mezclar sedes, se agrupan por materia + localidad.
	 * Una inscripción sin comisión y sin localidad no se expone al
	 * docente porque no podemos determinar de forma segura su alcance.
	 */
	const uncommissionedEnrollments = allowedLocationIds.length
		? await prisma.subjectEnrollment.findMany({
				where: {
					subjectId: {
						in: subjectIds
					},
					status: 'ACTIVE',
					commissionId: null,
					student: {
						status: 'ACTIVE',
						locationId: {
							in: allowedLocationIds
						}
					}
				},
				select: {
					id: true,
					subjectId: true,
					subject: {
						select: {
							code: true,
							name: true
						}
					},
					student: {
						select: {
							id: true,
							dni: true,
							firstName: true,
							lastName: true,
							currentYear: true,
							locationId: true,
							location: {
								select: {
									id: true,
									name: true
								}
							},
							career: {
								select: {
									name: true
								}
							}
						}
					}
				}
			})
		: [];

	const uncommissionedScopes = new Map<string, TeacherAttendanceScope>();

	for (const enrollment of uncommissionedEnrollments) {
		const locationId = enrollment.student.locationId;
		const location = enrollment.student.location;

		if (!locationId || !location) {
			continue;
		}

		const key = `uncommissioned:${enrollment.subjectId}:${locationId}`;

		let scope = uncommissionedScopes.get(key);

		if (!scope) {
			scope = {
				key,
				subjectId: enrollment.subjectId,
				subjectCode: enrollment.subject.code,
				subjectName: enrollment.subject.name,
				commissionId: null,
				commissionCode: null,
				locationId,
				locationName: location.name,
				label: `Sin comisión · ${location.name}`,
				students: []
			};

			uncommissionedScopes.set(key, scope);
		}

		if (!scope.students.some((student) => student.id === enrollment.student.id)) {
			scope.students.push(toAttendanceStudent(enrollment));
		}
	}

	const scopes = [
		...commissionScopes,
		...Array.from(uncommissionedScopes.values()).map((scope) => ({
			...scope,
			students: sortStudents(scope.students)
		}))
	].sort((a, b) => {
		const subjectComparison = a.subjectName.localeCompare(b.subjectName, 'es');

		if (subjectComparison !== 0) {
			return subjectComparison;
		}

		return a.label.localeCompare(b.label, 'es');
	});

	return {
		subjects,
		scopes
	};
}

export function buildTeacherAttendanceDeduplicationKey(input: {
	subjectId: string;
	commissionId: string | null;
	locationId: string | null;
	date: string;
}): string {
	const scopeKey = input.commissionId
		? `commission:${input.commissionId}`
		: `uncommissioned:${input.locationId ?? 'unknown'}`;

	return `subject:${input.subjectId}:${scopeKey}:date:${input.date}`;
}
