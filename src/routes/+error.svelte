<script lang="ts">
	import { page } from '$app/state';
</script>

<div class="min-h-screen bg-slate-950 text-white flex items-center justify-center">
	<div class="text-center max-w-lg px-6">
		<div class="text-8xl font-bold text-slate-700 mb-4">
			{page.status}
		</div>
		<h1 class="text-3xl font-bold mb-4">
			{page.status === 404 ? 'Página no encontrada' : 'Error del servidor'}
		</h1>
		<p class="text-slate-400 mb-8">
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
