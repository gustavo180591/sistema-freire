<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Mi Perfil | Paulo Freire</title>
</svelte:head>

<div class="mx-auto max-w-4xl space-y-8 p-6">
	<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-8">
		<div class="flex items-start justify-between">
			<div>
				<p class="text-sm tracking-[0.2em] text-slate-400 uppercase">Perfil institucional</p>
				<h1 class="mt-2 text-3xl font-bold">Mis datos</h1>
			</div>
			<a href="/alumno" class="rounded-2xl border border-slate-700 px-4 py-2 text-sm transition hover:bg-slate-800">
				← Volver al panel
			</a>
		</div>
	</div>

	<section class="space-y-6 rounded-3xl border border-slate-800 bg-slate-900/70 p-8">
		<div class="grid gap-6 md:grid-cols-2">
			<div>
				<label for="firstName" class="mb-2 block text-sm font-medium text-slate-300">Nombre</label>
				<input
					id="firstName"
					name="firstName"
					type="text"
					value={data.student.firstName}
					disabled
					class="w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-slate-500"
				/>
			</div>

			<div>
				<label for="lastName" class="mb-2 block text-sm font-medium text-slate-300">Apellido</label>
				<input
					id="lastName"
					name="lastName"
					type="text"
					value={data.student.lastName}
					disabled
					class="w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-slate-500"
				/>
			</div>

			<div>
				<label for="email" class="mb-2 block text-sm font-medium text-slate-300">Correo electrónico</label>
				<input
					id="email"
					name="email"
					type="email"
					value={data.student.email}
					disabled
					class="w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-slate-500"
				/>
			</div>

			<div>
				<label for="dni" class="mb-2 block text-sm font-medium text-slate-300">DNI</label>
				<input
					id="dni"
					type="text"
					value={data.student.dni}
					disabled
					class="w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-slate-500"
				/>
				<p class="mt-1 text-xs text-slate-500">El DNI no puede modificarse</p>
			</div>

			<div>
				<label for="career" class="mb-2 block text-sm font-medium text-slate-300">Carrera</label>
				<input
					id="career"
					type="text"
					value={data.student.career}
					disabled
					class="w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-slate-500"
				/>
				<p class="mt-1 text-xs text-slate-500">Para cambiar de carrera contacte Secretaría</p>
			</div>

			<div>
				<span class="mb-2 block text-sm font-medium text-slate-300">Estado</span>
				<div class="inline-flex items-center gap-2 rounded-full bg-emerald-950/50 px-4 py-2 text-emerald-400">
					<span class="h-2 w-2 rounded-full bg-emerald-400"></span>
					{data.student.status}
				</div>
			</div>
		</div>

		<div class="rounded-2xl border border-blue-900/60 bg-blue-950/30 p-4 text-sm text-blue-200">
			Los datos del perfil son solo lectura. Para solicitar cambios, contacte a Secretaría.
		</div>
	</section>
</div>
