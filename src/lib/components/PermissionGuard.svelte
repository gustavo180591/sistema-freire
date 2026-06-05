<script lang="ts">
	import { hasRole, hasAnyRole } from '$lib/client/permissions';

	type Props = {
		roles?: string | string[];
		requireAll?: boolean;
		children: import('svelte').Snippet;
		fallback?: import('svelte').Snippet;
	};

	let { roles, requireAll = false, children, fallback }: Props = $props();

	// Verificar si el usuario tiene los roles requeridos
	const hasAccess = $derived(() => {
		if (!roles) return true;
		
		if (requireAll) {
			if (typeof roles === 'string') return hasRole(roles);
			return roles.every(r => hasRole(r));
		}
		
		if (typeof roles === 'string') return hasRole(roles);
		return hasAnyRole(roles);
	});
</script>

{#if hasAccess()}
	{@render children()}
{:else if fallback}
	{@render fallback()}
{/if}
