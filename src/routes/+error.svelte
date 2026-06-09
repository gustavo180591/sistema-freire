<script lang="ts">
	import { page } from '$app/state';
</script>

<div class="flex min-h-screen items-center justify-center bg-slate-950 text-white">
	<div class="max-w-lg px-6 text-center">
		<div class="mb-4 text-8xl font-bold text-slate-700">
			{page.status}
		</div>
		<h1 class="mb-4 text-3xl font-bold">
			{page.status === 404 ? 'Página no encontrada' : 'Error del servidor'}
		</h1>
		<p class="mb-8 text-slate-400">
			{page.error?.message || 'Lo sentimos, no pudimos encontrar lo que estás buscando.'}
		</p>
		<a
			href="/dashboard"
			class="inline-block rounded-2xl bg-white px-6 py-3 font-semibold text-slate-950 transition hover:scale-[1.02]"
		>
			Volver al inicio
		</a>
	</div>
</div>
