<script lang="ts">
	let { data } = $props();

	const commissions = $derived(
		data?.commissions ?? [
			{
				id: '1',
				name: '1° A - Inicial',
				subject: 'Didáctica General',
				term: '1er Cuatrimestre 2026',
				teachers: 2,
				students: 38,
				active: true
			},
			{
				id: '2',
				name: '2° B - Matemática',
				subject: 'Álgebra I',
				term: '1er Cuatrimestre 2026',
				teachers: 1,
				students: 31,
				active: true
			}
		]
	);

	let search = $state('');

	const filtered = $derived(
		commissions.filter((item) => {
			const q = search.toLowerCase();
			return (
				item.name.toLowerCase().includes(q) ||
				item.subject.toLowerCase().includes(q) ||
				item.term.toLowerCase().includes(q)
			);
		})
	);
</script>

<svelte:head>
	<title>Comisiones | Instituto Paulo Freire</title>
	<meta name="description" content="Gestión de comisiones, docentes y matrícula" />
</svelte:head>

<div class="space-y-8">
	<section
		class="flex flex-col gap-4 rounded-3xl border border-slate-800 bg-slate-900/70 p-8 md:flex-row md:items-center md:justify-between"
	>
		<div>
			<p class="text-sm tracking-[0.2em] text-slate-400 uppercase">Secretaría académica</p>
			<h1 class="mt-2 text-4xl font-bold tracking-tight">Gestión de comisiones</h1>
			<p class="mt-3 max-w-3xl text-sm text-slate-400">
				Organización de cursadas, asignación docente, períodos académicos y matrícula por comisión.
			</p>
		</div>

		<a
			href="/comisiones/nueva"
			class="rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:scale-[1.02]"
		>
			+ Nueva comisión
		</a>
	</section>

	<section class="grid gap-4 md:grid-cols-3">
		<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
			<p class="text-sm text-slate-400">Comisiones activas</p>
			<h2 class="mt-3 text-4xl font-bold">{commissions.length}</h2>
			<p class="mt-2 text-sm text-slate-500">Oferta operativa del período</p>
		</div>
		<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
			<p class="text-sm text-slate-400">Docentes asignados</p>
			<h2 class="mt-3 text-4xl font-bold">
				{commissions.reduce((acc, item) => acc + item.teachers, 0)}
			</h2>
			<p class="mt-2 text-sm text-slate-500">Cobertura de cátedras</p>
		</div>
		<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
			<p class="text-sm text-slate-400">Alumnos inscriptos</p>
			<h2 class="mt-3 text-4xl font-bold">
				{commissions.reduce((acc, item) => acc + item.students, 0)}
			</h2>
			<p class="mt-2 text-sm text-slate-500">Matrícula consolidada</p>
		</div>
	</section>

	<section class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
		<input
			bind:value={search}
			type="text"
			placeholder="Buscar por comisión, materia o período"
			class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-slate-500"
		/>
	</section>

	<section class="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/70">
		<table class="w-full text-left">
			<thead class="border-b border-slate-800 bg-slate-900">
				<tr>
					<th class="px-6 py-4 text-sm font-semibold">Comisión</th>
					<th class="px-6 py-4 text-sm font-semibold">Materia</th>
					<th class="px-6 py-4 text-sm font-semibold">Período</th>
					<th class="px-6 py-4 text-sm font-semibold">Docentes</th>
					<th class="px-6 py-4 text-sm font-semibold">Alumnos</th>
					<th class="px-6 py-4 text-sm font-semibold">Estado</th>
					<th class="px-6 py-4 text-right text-sm font-semibold">Acciones</th>
				</tr>
			</thead>
			<tbody>
				{#each filtered as item}
					<tr class="border-b border-slate-800 last:border-none">
						<td class="px-6 py-4 font-medium">{item.name}</td>
						<td class="px-6 py-4">{item.subject}</td>
						<td class="px-6 py-4 text-slate-300">{item.term}</td>
						<td class="px-6 py-4">{item.teachers}</td>
						<td class="px-6 py-4">{item.students}</td>
						<td class="px-6 py-4">
							<span class="rounded-full border border-slate-700 px-3 py-1 text-xs">
								{item.active ? 'Activa' : 'Inactiva'}
							</span>
						</td>
						<td class="px-6 py-4 text-right">
							<a
								href={`/comisiones/${item.id}`}
								class="rounded-xl border border-slate-700 px-3 py-2 text-sm transition hover:border-slate-500"
							>
								Ver detalle
							</a>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</section>
</div>
