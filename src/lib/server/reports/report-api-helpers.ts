import type { ReportFilters } from './reports.types';

/**
 * Parse and validate filters from URL search params
 */
export function parseFilters(url: URL): ReportFilters {
	const filters: ReportFilters = {};

	// Parse careerId
	if (url.searchParams.has('careerId')) {
		filters.careerId = url.searchParams.get('careerId') || undefined;
	}

	// Parse subjectId
	if (url.searchParams.has('subjectId')) {
		filters.subjectId = url.searchParams.get('subjectId') || undefined;
	}

	// Parse commissionId
	if (url.searchParams.has('commissionId')) {
		filters.commissionId = url.searchParams.get('commissionId') || undefined;
	}

	// Parse studentId
	if (url.searchParams.has('studentId')) {
		filters.studentId = url.searchParams.get('studentId') || undefined;
	}

	// Parse teacherId
	if (url.searchParams.has('teacherId')) {
		filters.teacherId = url.searchParams.get('teacherId') || undefined;
	}

	// Parse locationId
	if (url.searchParams.has('locationId')) {
		filters.locationId = url.searchParams.get('locationId') || undefined;
	}

	// Parse startDate
	if (url.searchParams.has('startDate')) {
		const startDateStr = url.searchParams.get('startDate');
		if (startDateStr) {
			const startDate = new Date(startDateStr);
			if (isNaN(startDate.getTime())) {
				throw new Error('Invalid startDate format');
			}
			filters.startDate = startDate;
		}
	}

	// Parse endDate
	if (url.searchParams.has('endDate')) {
		const endDateStr = url.searchParams.get('endDate');
		if (endDateStr) {
			const endDate = new Date(endDateStr);
			if (isNaN(endDate.getTime())) {
				throw new Error('Invalid endDate format');
			}
			filters.endDate = endDate;
		}
	}

	// Validate date range
	if (filters.startDate && filters.endDate) {
		if (filters.startDate > filters.endDate) {
			throw new Error('startDate must be before or equal to endDate');
		}
	}

	return filters;
}

/**
 * Format API response
 */
export function formatApiResponse<T>(data: T, filters?: ReportFilters) {
	return {
		success: true,
		data,
		filters: filters || {},
		generatedAt: new Date().toISOString()
	};
}

/**
 * Format API error response
 */
export function formatApiError(message: string) {
	return {
		success: false,
		error: message
	};
}
