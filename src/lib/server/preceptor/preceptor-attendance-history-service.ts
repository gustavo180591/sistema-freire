import { AttendanceStatus, type Prisma } from '@prisma/client';

import { prisma } from '$lib/server/db/prisma';
import { getPreceptorScope } from '$lib/server/preceptor/preceptor-scope-service';

const NO_COMMISSION = '__NO_COMMISSION__';
const DEFAULT_PAGE_SIZE = 10;
const ALLOWED_PAGE_SIZES = new Set([10, 20, 50]);
const MAX_SEARCH_LENGTH = 100;

interface NormalizedHistoryFilters {
	q: string;
	subjectId: string | null;
	commissionId: string | null;
	locationId: string | null;
	dateFrom: string | null;
	dateTo: string | null;
	page: number;
	pageSize: number;
}

function normalizeOptionalValue(value: string | null): string | null {
	const normalized = value?.trim() ?? '';
	return normalized || null;
}

function normalizeSearch(value: string | null): string {
	return (value?.trim() ?? '').slice(0, MAX_SEARCH_LENGTH);
}

function parsePositiveInteger(value: string | null, fallback: number): number {
	if (!value) {
		return fallback;
	}

	const parsed = Number(value);

	if (!Number.isInteger(parsed) || parsed < 1) {
		return fallback;
	}

	return parsed;
}

function parsePageSize(value: string | null): number {
	const parsed = parsePositiveInteger(value, DEFAULT_PAGE_SIZE);
	return ALLOWED_PAGE_SIZES.has(parsed) ? parsed : DEFAULT_PAGE_SIZE;
}

function parseDateOnly(value: string | null): Date | null {
	if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
		return null;
	}

	const parsed = new Date(`${value}T00:00:00.000Z`);

	if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
		return null;
	}

	return parsed;
}

function buildScopeWhere(locationIds: string[]): Prisma.AttendanceRecordWhereInput {
	return {
		OR: [
			{
				locationId: {
					in: locationIds
				}
			},
			{
				locationId: null,
				commission: {
					is: {
						locationId: {
							in: locationIds
						}
					}
				}
			},
			{
				locationId: null,
				commissionId: null,
				entries: {
					some: {
						student: {
							locationId: {
								in: locationIds
							}
						}
					}
				}
			}
		]
	};
}

function buildLocationWhere(locationId: string): Prisma.AttendanceRecordWhereInput {
	return {
		OR: [
			{
				locationId
			},
			{
				locationId: null,
				commission: {
					is: {
						locationId
					}
				}
			},
			{
				locationId: null,
				commissionId: null,
				entries: {
					some: {
						student: {
							locationId
						}
					}
				}
			}
		]
	};
}

function buildEmptyResult(filters: NormalizedHistoryFilters, filterError: string) {
	return {
		records: [],
		pagination: {
			page: 1,
			pageSize: filters.pageSize,
			totalCount: 0,
			totalPages: 0,
			hasPrev: false,
			hasNext: false
		},
		filters: {
			...filters,
			page: 1
		},
		filterError
	};
}

export async function getPreceptorAttendanceHistory(userId: string, searchParams: URLSearchParams) {
	const scope = await getPreceptorScope(userId);

	const rawDateFrom = normalizeOptionalValue(searchParams.get('dateFrom'));
	const rawDateTo = normalizeOptionalValue(searchParams.get('dateTo'));

	const filters: NormalizedHistoryFilters = {
		q: normalizeSearch(searchParams.get('q')),
		subjectId: normalizeOptionalValue(searchParams.get('subjectId')),
		commissionId: normalizeOptionalValue(searchParams.get('commissionId')),
		locationId: normalizeOptionalValue(searchParams.get('locationId')),
		dateFrom: rawDateFrom,
		dateTo: rawDateTo,
		page: parsePositiveInteger(searchParams.get('page'), 1),
		pageSize: parsePageSize(searchParams.get('pageSize'))
	};

	const dateFrom = parseDateOnly(filters.dateFrom);
	const dateTo = parseDateOnly(filters.dateTo);

	if (filters.dateFrom && !dateFrom) {
		return buildEmptyResult(filters, 'La fecha inicial del filtro no es válida.');
	}

	if (filters.dateTo && !dateTo) {
		return buildEmptyResult(filters, 'La fecha final del filtro no es válida.');
	}

	if (dateFrom && dateTo && dateFrom.getTime() > dateTo.getTime()) {
		return buildEmptyResult(filters, 'La fecha inicial no puede ser posterior a la fecha final.');
	}

	if (filters.locationId && !scope.locationIds.includes(filters.locationId)) {
		return buildEmptyResult(filters, 'La sede seleccionada no pertenece a tu ámbito de trabajo.');
	}

	const conditions: Prisma.AttendanceRecordWhereInput[] = [buildScopeWhere(scope.locationIds)];

	if (filters.subjectId) {
		conditions.push({
			subjectId: filters.subjectId
		});
	}

	if (filters.commissionId === NO_COMMISSION) {
		conditions.push({
			commissionId: null
		});
	} else if (filters.commissionId) {
		conditions.push({
			commissionId: filters.commissionId
		});
	}

	if (filters.locationId) {
		conditions.push(buildLocationWhere(filters.locationId));
	}

	if (dateFrom || dateTo) {
		conditions.push({
			classDate: {
				...(dateFrom ? { gte: dateFrom } : {}),
				...(dateTo ? { lte: dateTo } : {})
			}
		});
	}

	if (filters.q) {
		conditions.push({
			OR: [
				{
					subject: {
						is: {
							code: {
								contains: filters.q,
								mode: 'insensitive'
							}
						}
					}
				},
				{
					subject: {
						is: {
							name: {
								contains: filters.q,
								mode: 'insensitive'
							}
						}
					}
				},
				{
					commission: {
						is: {
							code: {
								contains: filters.q,
								mode: 'insensitive'
							}
						}
					}
				}
			]
		});
	}

	const where: Prisma.AttendanceRecordWhereInput = {
		AND: conditions
	};

	const totalCount = await prisma.attendanceRecord.count({
		where
	});

	const totalPages = totalCount === 0 ? 0 : Math.ceil(totalCount / filters.pageSize);

	const page = totalPages === 0 ? 1 : Math.min(filters.page, totalPages);

	const records =
		totalCount === 0
			? []
			: await prisma.attendanceRecord.findMany({
					where,
					orderBy: [
						{
							classDate: 'desc'
						},
						{
							createdAt: 'desc'
						},
						{
							id: 'desc'
						}
					],
					skip: (page - 1) * filters.pageSize,
					take: filters.pageSize,
					select: {
						id: true,
						subjectId: true,
						commissionId: true,
						locationId: true,
						classDate: true,
						createdAt: true,
						subject: {
							select: {
								code: true,
								name: true
							}
						},
						location: {
							select: {
								name: true
							}
						},
						commission: {
							select: {
								id: true,
								code: true,
								locationId: true,
								location: {
									select: {
										name: true
									}
								}
							}
						},
						entries: {
							select: {
								present: true,
								status: true,
								student: {
									select: {
										locationId: true,
										location: {
											select: {
												name: true
											}
										}
									}
								}
							}
						}
					}
				});

	const legacyVisibleLocationIds = filters.locationId
		? new Set([filters.locationId])
		: new Set(scope.locationIds);

	const normalizedRecords = records.map((record) => {
		const hasCanonicalScope = Boolean(record.locationId) || Boolean(record.commission?.locationId);

		const visibleEntries = hasCanonicalScope
			? record.entries
			: record.entries.filter(
					(entry) =>
						Boolean(entry.student.locationId) &&
						legacyVisibleLocationIds.has(entry.student.locationId as string)
				);

		const presentStudents = visibleEntries.filter(
			(entry) =>
				entry.status === AttendanceStatus.PRESENT ||
				entry.status === AttendanceStatus.LATE ||
				(entry.status === null && entry.present)
		).length;

		const visibleLegacyLocationNames = [
			...new Set(
				visibleEntries
					.map((entry) => entry.student.location?.name ?? null)
					.filter((name): name is string => Boolean(name))
			)
		];

		const locationName =
			record.location?.name ??
			record.commission?.location?.name ??
			(visibleLegacyLocationNames.length === 1 ? visibleLegacyLocationNames[0] : 'Registro legacy');

		return {
			id: record.id,
			date: record.classDate,
			createdAt: record.createdAt,
			subjectId: record.subjectId,
			subjectCode: record.subject.code,
			subjectName: record.subject.name,
			commissionId: record.commissionId,
			commissionCode: record.commission?.code ?? null,
			locationId: record.locationId ?? record.commission?.locationId ?? null,
			locationName,
			totalStudents: visibleEntries.length,
			presentStudents
		};
	});

	return {
		records: normalizedRecords,
		pagination: {
			page,
			pageSize: filters.pageSize,
			totalCount,
			totalPages,
			hasPrev: page > 1,
			hasNext: page < totalPages
		},
		filters: {
			...filters,
			page
		},
		filterError: null
	};
}
