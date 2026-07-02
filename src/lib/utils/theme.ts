/**
 * Theme utilities for light/dark mode toggle
 */

export type Theme = 'light' | 'dark';

const THEME_STORAGE_KEY = 'theme';

/**
 * Get the current theme from localStorage or system preference
 */
export function getTheme(): Theme {
	if (typeof window === 'undefined') {
		return 'dark'; // Default to dark mode on server
	}

	const stored = localStorage.getItem(THEME_STORAGE_KEY);
	if (stored === 'light' || stored === 'dark') {
		return stored;
	}

	// Check system preference
	if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
		return 'light';
	}

	return 'dark';
}

/**
 * Set the theme in localStorage and apply it to the document
 */
export function setTheme(theme: Theme): void {
	if (typeof window === 'undefined') {
		return;
	}

	localStorage.setItem(THEME_STORAGE_KEY, theme);
	applyTheme(theme);
}

/**
 * Apply the theme to the document by adding/removing the 'dark' class
 */
export function applyTheme(theme: Theme): void {
	if (typeof document === 'undefined') {
		return;
	}

	const html = document.documentElement;

	if (theme === 'dark') {
		html.classList.add('dark');
	} else {
		html.classList.remove('dark');
	}
}

/**
 * Initialize the theme on page load
 */
export function initTheme(): void {
	const theme = getTheme();
	applyTheme(theme);
}

/**
 * Toggle between light and dark mode
 */
export function toggleTheme(): Theme {
	const current = getTheme();
	const next: Theme = current === 'dark' ? 'light' : 'dark';
	setTheme(next);
	return next;
}
