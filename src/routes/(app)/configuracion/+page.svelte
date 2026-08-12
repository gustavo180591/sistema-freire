<svelte:head>
	<title>Configuración | Sistema Freire</title>
</svelte:head>

<div class="mx-auto max-w-7xl space-y-8">
	<div class="flex items-center justify-between">
		<div>
			<p class="text-sm tracking-[0.2em] text-slate-400 uppercase">Sistema</p>
			<h1 class="text-3xl font-bold">Configuración</h1>
			<p class="mt-2 max-w-3xl text-sm text-slate-400">
				Administrá desde un solo lugar la configuración académica, institucional y financiera del
				sistema.
			</p>
		</div>
	</div>

	<section class="space-y-4">
		<div>
			<p class="text-sm tracking-[0.2em] text-slate-500 uppercase">Académico</p>
			<h2 class="mt-1 text-xl font-bold text-white">Configuración académica</h2>
			<p class="mt-1 text-sm text-slate-400">
				Gestioná carreras, materias, comisiones y correlatividades.
			</p>
		</div>

		<div class="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
			<a
				href="/carreras"
				class="group rounded-3xl border border-slate-800 bg-slate-900/70 p-6 transition hover:border-indigo-500 hover:bg-slate-800/50 dark:border-slate-700 dark:hover:border-indigo-400"
			>
				<div
					class="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-500 transition group-hover:bg-indigo-500 group-hover:text-white dark:bg-indigo-500/20 dark:text-indigo-400"
				>
					<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z"
						/>
					</svg>
				</div>
				<h3 class="mb-2 text-xl font-bold text-white">Carreras</h3>
				<p class="text-sm text-slate-400">
					Administrar carreras, datos generales, duración y estado académico.
				</p>
			</a>

			<a
				href="/materias"
				class="group rounded-3xl border border-slate-800 bg-slate-900/70 p-6 transition hover:border-indigo-500 hover:bg-slate-800/50 dark:border-slate-700 dark:hover:border-indigo-400"
			>
				<div
					class="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500 transition group-hover:bg-emerald-500 group-hover:text-white dark:bg-emerald-500/20 dark:text-emerald-400"
				>
					<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
						/>
					</svg>
				</div>
				<h3 class="mb-2 text-xl font-bold text-white">Materias</h3>
				<p class="text-sm text-slate-400">
					Crear, editar y vincular materias a una o varias carreras.
				</p>
			</a>

			<a
				href="/comisiones"
				class="group rounded-3xl border border-slate-800 bg-slate-900/70 p-6 transition hover:border-indigo-500 hover:bg-slate-800/50 dark:border-slate-700 dark:hover:border-indigo-400"
			>
				<div
					class="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500 transition group-hover:bg-amber-500 group-hover:text-white dark:bg-amber-500/20 dark:text-amber-400"
				>
					<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
						/>
					</svg>
				</div>
				<h3 class="mb-2 text-xl font-bold text-white">Comisiones</h3>
				<p class="text-sm text-slate-400">
					Crear y administrar comisiones por carrera, año, sede y grupo.
				</p>
			</a>

			<a
				href="/correlatividades"
				class="group rounded-3xl border border-slate-800 bg-slate-900/70 p-6 transition hover:border-indigo-500 hover:bg-slate-800/50 dark:border-slate-700 dark:hover:border-indigo-400"
			>
				<div
					class="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/10 text-purple-500 transition group-hover:bg-purple-500 group-hover:text-white dark:bg-purple-500/20 dark:text-purple-400"
				>
					<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M7 17l.597-.267A2 2 0 018.238 17H9a2 2 0 012 2v1a2 2 0 01-2 2H5a2 2 0 01-2-2v-1a2 2 0 012-2h.762a2 2 0 01.641-.267L7 17zm3.414-5.656a2 2 0 00-2.828 0l-4 4a2 2 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
						/>
					</svg>
				</div>
				<h3 class="mb-2 text-xl font-bold text-white">Correlatividades</h3>
				<p class="text-sm text-slate-400">
					Gestionar requisitos, correlativas y relaciones entre materias.
				</p>
			</a>
		</div>
	</section>

	<section class="space-y-4">
		<div>
			<p class="text-sm tracking-[0.2em] text-slate-500 uppercase">Institucional</p>
			<h2 class="mt-1 text-xl font-bold text-white">Configuración general</h2>
			<p class="mt-1 text-sm text-slate-400">
				Administrá sedes, calendario, ciclos lectivos, cuotas, cargos y recibos.
			</p>
		</div>

		<div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
			<a
				href="/configuracion/calendario"
				class="group rounded-3xl border border-slate-800 bg-slate-900/70 p-6 transition hover:border-indigo-500 hover:bg-slate-800/50 dark:border-slate-700 dark:hover:border-indigo-400"
			>
				<div
					class="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-500 transition group-hover:bg-indigo-500 group-hover:text-white dark:bg-indigo-500/20 dark:text-indigo-400"
				>
					<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
						/>
					</svg>
				</div>
				<h3 class="mb-2 text-xl font-bold text-white">Calendario y Horarios</h3>
				<p class="text-sm text-slate-400">
					Configurar calendario académico, fechas importantes y horarios.
				</p>
			</a>

			<a
				href="/configuracion/localidades"
				class="group rounded-3xl border border-slate-800 bg-slate-900/70 p-6 transition hover:border-indigo-500 hover:bg-slate-800/50 dark:border-slate-700 dark:hover:border-indigo-400"
			>
				<div
					class="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500 transition group-hover:bg-emerald-500 group-hover:text-white dark:bg-emerald-500/20 dark:text-emerald-400"
				>
					<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
						/>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
						/>
					</svg>
				</div>
				<h3 class="mb-2 text-xl font-bold text-white">Localidades / Sedes</h3>
				<p class="text-sm text-slate-400">
					Administrar sedes, carreras habilitadas y asignaciones institucionales.
				</p>
			</a>

			<a
				href="/configuracion/cuotas"
				class="group rounded-3xl border border-slate-800 bg-slate-900/70 p-6 transition hover:border-indigo-500 hover:bg-slate-800/50 dark:border-slate-700 dark:hover:border-indigo-400"
			>
				<div
					class="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500 transition group-hover:bg-amber-500 group-hover:text-white dark:bg-amber-500/20 dark:text-amber-400"
				>
					<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
				</div>
				<h3 class="mb-2 text-xl font-bold text-white">Cuotas</h3>
				<p class="text-sm text-slate-400">
					Configurar beneficios de beca y recursante para cuotas.
				</p>
			</a>

			<a
				href="/configuracion/ciclos-lectivos"
				class="group rounded-3xl border border-slate-800 bg-slate-900/70 p-6 transition hover:border-indigo-500 hover:bg-slate-800/50 dark:border-slate-700 dark:hover:border-indigo-400"
			>
				<div
					class="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/10 text-purple-500 transition group-hover:bg-purple-500 group-hover:text-white dark:bg-purple-500/20 dark:text-purple-400"
				>
					<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
						/>
					</svg>
				</div>
				<h3 class="mb-2 text-xl font-bold text-white">Ciclos Lectivos</h3>
				<p class="text-sm text-slate-400">
					Gestionar ciclos lectivos activos y períodos académicos.
				</p>
			</a>

			<a
				href="/configuracion/conceptos-cargo"
				class="group rounded-3xl border border-slate-800 bg-slate-900/70 p-6 transition hover:border-indigo-500 hover:bg-slate-800/50 dark:border-slate-700 dark:hover:border-indigo-400"
			>
				<div
					class="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-rose-500/10 text-rose-500 transition group-hover:bg-rose-500 group-hover:text-white dark:bg-rose-500/20 dark:text-rose-400"
				>
					<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
						/>
					</svg>
				</div>
				<h3 class="mb-2 text-xl font-bold text-white">Conceptos de Cargo</h3>
				<p class="text-sm text-slate-400">
					Administrar conceptos de cobro, inscripción, cuotas y otros cargos.
				</p>
			</a>

			<a
				href="/configuracion/recibos-sueldo"
				class="group rounded-3xl border border-slate-800 bg-slate-900/70 p-6 transition hover:border-indigo-500 hover:bg-slate-800/50 dark:border-slate-700 dark:hover:border-indigo-400"
			>
				<div
					class="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-500 transition group-hover:bg-cyan-500 group-hover:text-white dark:bg-cyan-500/20 dark:text-cyan-400"
				>
					<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
						/>
					</svg>
				</div>
				<h3 class="mb-2 text-xl font-bold text-white">Recibos de Sueldo</h3>
				<p class="text-sm text-slate-400">
					Configurar el dominio del portal externo de recibos de sueldo.
				</p>
			</a>

			<a
				href="/configuracion/recibo"
				class="group rounded-3xl border border-slate-800 bg-slate-900/70 p-6 transition hover:border-indigo-500 hover:bg-slate-800/50 dark:border-slate-700 dark:hover:border-indigo-400"
			>
				<div
					class="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-sky-500/10 text-sky-500 transition group-hover:bg-sky-500 group-hover:text-white dark:bg-sky-500/20 dark:text-sky-400"
				>
					<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
						/>
					</svg>
				</div>
				<h3 class="mb-2 text-xl font-bold text-white">Recibo</h3>
				<p class="text-sm text-slate-400">
					Configurar la información que se muestra en el recibo de pago.
				</p>
			</a>
		</div>
	</section>
</div>
