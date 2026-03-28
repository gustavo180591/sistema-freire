import { prisma } from '$lib/server/db/prisma';

const RISK_THRESHOLD = 75;

export type AcademicReportRow = {
    id: string;
    student: string;
    career: string;
    subject: string;
    attendancePercent: number;
    regularityStatus: string;
};

export type AcademicReportResult = {
    rows: AcademicReportRow[];
    metrics: {
        activeStudents: number;
        activeCommissions: number;
        riskStudents: number;
        regularCount: number;
        libreCount: number;
    };
};

export async function getAcademicReport(): Promise<AcademicReportResult> {
    const [activeStudents, activeCommissions, statuses] = await Promise.all([
        prisma.student.count({
            where: { status: 'ACTIVE' }
        }),
        prisma.commission.count({
            where: { active: true }
        }),
        prisma.studentSubjectStatus.findMany({
            include: {
                student: {
                    include: {
                        career: {
                            select: {
                                name: true
                            }
                        }
                    }
                },
                subject: {
                    select: {
                        name: true
                    }
                }
            },
            orderBy: [
                { student: { lastName: 'asc' } },
                { student: { firstName: 'asc' } }
            ]
        })
    ]);

    const rows: AcademicReportRow[] = statuses.map((status) => ({
        id: status.id,
        student: `${status.student.firstName} ${status.student.lastName}`.trim(),
        career: status.student.career.name,
        subject: status.subject.name,
        attendancePercent: Number(status.attendancePercent ?? 0),
        regularityStatus: status.regularityStatus
    }));

    const regularCount = rows.filter(
        (row) => row.regularityStatus === 'REGULAR'
    ).length;

    const libreCount = rows.filter(
        (row) => row.regularityStatus === 'LIBRE'
    ).length;

    const riskStudents = rows.filter(
        (row) => row.attendancePercent < RISK_THRESHOLD
    ).length;

    return {
        rows,
        metrics: {
            activeStudents,
            activeCommissions,
            riskStudents,
            regularCount,
            libreCount
        }
    };
}
