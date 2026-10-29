<script lang="ts">
	type TeacherOption = {
		id: string;
		dni?: string | null;
		firstName: string;
		lastName: string;
	};

	let {
		teachers,
		name,
		id,
		form,
		value = $bindable(''),
		placeholder = 'Buscar docente...',
		required = false,
		disabled = false
	}: {
		teachers: TeacherOption[];
		name: string;
		id?: string;
		form?: string;
		value?: string;
		placeholder?: string;
		required?: boolean;
		disabled?: boolean;
	} = $props();

	const listboxId = $derived(`${id ?? form ?? name}-options`);

	let search = $state('');
	let open = $state(false);

	const selectedTeacher = $derived(teachers.find((teacher) => teacher.id === value));

	function teacherLabel(teacher: TeacherOption) {
		return `${teacher.lastName}, ${teacher.firstName}`;
	}

	function normalize(value: string) {
		return value
			.normalize('NFD')
			.replace(/[\u0300-\u036f]/g, '')
			.toLocaleLowerCase('es');
	}

	const filteredTeachers = $derived.by(() => {
		const normalizedSearch = normalize(search.trim());

		if (!normalizedSearch) {
			return teachers;
		}

		return teachers.filter((teacher) => {
			const searchableValue = normalize(
				`${teacher.lastName} ${teacher.firstName} ${teacher.dni ?? ''}`
			);

			return searchableValue.includes(normalizedSearch);
		});
	});

	function selectTeacher(teacher: TeacherOption) {
		value = teacher.id;
		search = teacherLabel(teacher);
		open = false;
	}

	function handleInput(event: Event) {
		const input = event.currentTarget as HTMLInputElement;

		search = input.value;

		if (selectedTeacher && search !== teacherLabel(selectedTeacher)) {
			value = '';
		}

		open = true;
	}

	function handleFocus() {
		if (selectedTeacher) {
			search = teacherLabel(selectedTeacher);
		}

		open = true;
	}

	function handleBlur() {
		window.setTimeout(() => {
			open = false;

			if (selectedTeacher) {
				search = teacherLabel(selectedTeacher);
			} else if (value === '') {
				search = '';
			}
		}, 120);
	}

	$effect(() => {
		if (!open) {
			search = selectedTeacher ? teacherLabel(selectedTeacher) : '';
		}
	});
</script>

<div class="relative">
	<input type="hidden" {name} {form} {value} />

	<input
		{id}
		type="search"
		value={search}
		{placeholder}
		{required}
		{disabled}
		autocomplete="off"
		role="combobox"
		aria-expanded={open}
		aria-controls={listboxId}
		onfocus={handleFocus}
		oninput={handleInput}
		onblur={handleBlur}
		class="w-full rounded-lg border border-emerald-500/50 bg-slate-950 px-2 py-2 text-xs text-white transition outline-none placeholder:text-slate-600 focus:border-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
	/>

	{#if open && !disabled}
		<div
			id={listboxId}
			class="absolute z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-slate-700 bg-slate-950 p-1 shadow-2xl"
		>
			{#if filteredTeachers.length === 0}
				<p class="px-3 py-3 text-xs text-slate-500">No se encontraron docentes.</p>
			{:else}
				{#each filteredTeachers as teacher (teacher.id)}
					<button
						type="button"
						onmousedown={(event) => event.preventDefault()}
						onclick={() => selectTeacher(teacher)}
						class="block w-full rounded-lg px-3 py-2 text-left transition hover:bg-slate-800"
					>
						<p class="text-xs font-semibold text-slate-200">
							{teacher.lastName}, {teacher.firstName}
						</p>

						{#if teacher.dni}
							<p class="mt-0.5 text-[10px] text-slate-500">
								DNI {teacher.dni}
							</p>
						{/if}
					</button>
				{/each}
			{/if}
		</div>
	{/if}
</div>
