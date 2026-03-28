import { prisma } from '$lib/server/db/prisma';

export type OfficialDocumentRow = {
    id: string;
    name: string;
    type: string;
    period: string;
    status: string;
};

export type OfficialReportResult = {
    documents: OfficialDocumentRow[];
    metrics: {
        records: number;
        matrix: number;
        rosters: number;
        certificates: number;
    };
};

export async function getOfficialReport(): Promise<OfficialReportResult> {
    const [gradesCount, studentsCount, enrollmentsCount, latestTerm] =
        await Promise.all([
            prisma.grade.count(),
            prisma.student.count({
                where: { status: 'ACTIVE' }
            }),
            prisma.enrollment.count({
                where: { status: 'ACTIVE' }
            }),
            prisma.academicTerm.findFirst({
                where: { active: true },
                orderBy: [{ year: 'desc' }]
            })
        ]);

    const period = latestTerm
        ? `${latestTerm.name} ${latestTerm.year}`
        : 'Período institucional';

    const documents: OfficialDocumentRow[] = [
        {
            id: 'exam-records',
            name: 'Actas de examen final',
            type: 'ACTA',
            period,
            status: 'Disponible'
        },
        {
            id: 'matrix-book',
            name: 'Libro matriz académico',
            type: 'LIBRO MATRIZ',
            period,
            status: 'Disponible'
        },
        {
            id: 'active-roster',
            name: 'Nómina de alumnos activos',
            type: 'NÓMINA',
            period,
            status: 'Disponible'
        },
        {
            id: 'regular-certificates',
            name: 'Certificados de regularidad',
            type: 'CERTIFICADO',
            period,
            status: 'Generable'
        }
    ];

    return {
        documents,
        metrics: {
            records: gradesCount,
            matrix: gradesCount,
            rosters: studentsCount,
            certificates: enrollmentsCount
        }
    };
}