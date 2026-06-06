<script lang="ts">
    import { enhance } from '$app/forms';
    import { canManageSubjects } from '$lib/client/permissions';
    import { page } from '$app/stores';
    
    let { data, form } = $props();
    
    const subjects = $derived(data.subjects);
    const careers = $derived(data.careers);
    const yearLevels = $derived(data.yearLevels);
    
    let selectedCareerId = $state('');
    let selectedYear = $state('');
    let modalOpen = $state(false);
    let editingSubject = $state<typeof subjects[0] | null>(null);
    let correlativesModalOpen = $state(false);
    let correlativesEditingSubject = $state<typeof subjects[0] | null>(null);
    let correlativesType = $state<'REGULAR' | 'APROBADO' | 'APROBADO_APROBAR'>('REGULAR');
    let correlativesSearch = $state('');
    
    // CRUD modals
    let createModalOpen = $state(false);
    let editModalOpen = $state(false);
    let deleteModalOpen = $state(false);
    let viewModalOpen = $state(false);
    let crudSubject = $state<typeof subjects[0] | null>(null);
    
    // Edit correlatives modal
    let editCorrelativesModalOpen = $state(false);
    let editCorrelativesSubject = $state<typeof subjects[0] | null>(null);
    
    const selectedCareer = $derived(careers.find(c => c.id === selectedCareerId));
    
    const hasActiveFilters = $derived(selectedCareerId !== '' || selectedYear !== '');
    
    const availableYears = $derived(() => {
        if (selectedCareer) {
            return Array.from({ length: selectedCareer.durationYears }, (_, i) => i + 1);
        }
        return [1, 2, 3, 4];
    });
    
    const filteredSubjects = $derived(subjects.filter(subject => {
        const matchesCareer = !selectedCareerId || subject.careers.some(c => c.id === selectedCareerId);
        const matchesYear = !selectedYear || subject.yearLevel === parseInt(selectedYear);
        return matchesCareer && matchesYear;
    }));
    
    const accreditationModeLabels: Record<string, string> = {
        PROMOCIONAL: 'Promocional',
        EXAMEN_FINAL: 'Examen Final',
        PROMOCIONAL_SIN_FINAL: 'Promocional sin examen final'
    };
    
    const accreditationModeColors: Record<string, string> = {
        PROMOCIONAL: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        EXAMEN_FINAL: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
        PROMOCIONAL_SIN_FINAL: 'bg-blue-500/10 text-blue-400 border-blue-500/20'
    };
    
    function clearFilters() {
        selectedCareerId = '';
        selectedYear = '';
    }
    
    function getCorrelativeBadge(correlatives: string[], colorClass: string) {
        if (correlatives.length === 0) {
            return { text: '-', class: 'text-slate-600 text-xs' };
        }
        const text = correlatives.slice(0, 2).join(', ') + (correlatives.length > 2 ? ` (+${correlatives.length - 2})` : '');
        return { text, class: `inline-flex items-center rounded-lg border px-2 py-1 text-xs font-medium ${colorClass} max-w-[150px] truncate` };
    }
    
    function openModal(subject: typeof subjects[0]) {
        editingSubject = subject;
        modalOpen = true;
    }
    
    function closeModal() {
        modalOpen = false;
        editingSubject = null;
    }
    
    function openCorrelativesModal(subject: typeof subjects[0], type: 'REGULAR' | 'APROBADO' | 'APROBADO_APROBAR') {
        correlativesEditingSubject = subject;
        correlativesType = type;
        correlativesModalOpen = true;
    }
    
    function closeCorrelativesModal() {
        correlativesModalOpen = false;
        correlativesEditingSubject = null;
        correlativesSearch = '';
    }
    
    const filteredCareerSubjects = $derived(() => {
        if (!correlativesEditingSubject) return [];

        // Get correlatives names only for the current type being added
        let existingCorrelativesOfType: string[] = [];
        if (correlativesType === 'REGULAR') {
            existingCorrelativesOfType = correlativesEditingSubject.correlativesRegular;
        } else if (correlativesType === 'APROBADO') {
            existingCorrelativesOfType = correlativesEditingSubject.correlativesAprobadoCursar;
        } else if (correlativesType === 'APROBADO_APROBAR') {
            existingCorrelativesOfType = correlativesEditingSubject.correlativesAprobadoAprobar;
        }

        const existingCorrelativesSet = new Set(existingCorrelativesOfType);

        const searchLower = correlativesSearch.toLowerCase();

        // Use selected career filter if available, otherwise use all careers of the editing subject
        const careersToFilter = selectedCareerId
            ? careers.filter(c => c.id === selectedCareerId)
            : correlativesEditingSubject.careers;

        return careersToFilter.map(career => ({
            career,
            subjects: subjects.filter(s =>
                s.careers.some(c => c.id === career.id) &&
                s.id !== correlativesEditingSubject?.id &&
                !existingCorrelativesSet.has(s.name) &&
                (s.name.toLowerCase().includes(searchLower) ||
                 s.code.toLowerCase().includes(searchLower))
            )
        })).filter(group => group.subjects.length > 0);
    });
    
    function openCreateModal() {
        crudSubject = null;
        createModalOpen = true;
    }
    
    function openEditModal(subject: typeof subjects[0]) {
        crudSubject = subject;
        editModalOpen = true;
    }
    
    function openEditCorrelativesModal(subject: typeof subjects[0]) {
        editCorrelativesSubject = subject;
        editCorrelativesModalOpen = true;
    }
    
    function openDeleteModal(subject: typeof subjects[0]) {
        crudSubject = subject;
        deleteModalOpen = true;
    }
    
    function openViewModal(subject: typeof subjects[0]) {
        crudSubject = subject;
        viewModalOpen = true;
    }
    
    function closeAllModals() {
        createModalOpen = false;
        editModalOpen = false;
        editCorrelativesModalOpen = false;
        deleteModalOpen = false;
        viewModalOpen = false;
        crudSubject = null;
        editCorrelativesSubject = null;
    }
</script>

<svelte:head>
    <title>Correlatividades | Sistema Freire</title>
</svelte:head>

<div class="space-y-6">
    <!-- Header -->
    <section class="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
        <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
                <span class="inline-flex items-center rounded-lg bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-400">
                    Gestión académica
                </span>
                <h1 class="mt-2 text-2xl font-semibold text-white">Correlatividades</h1>
                <p class="mt-1 text-sm text-slate-400">Administra los requisitos para cursar y aprobar materias del plan de estudios</p>
            </div>
            {#if canManageSubjects()}
                <a
                    href="/materias/nueva"
                    class="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition-all hover:bg-slate-100"
                >
                    <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                    </svg>
                    Nueva materia
                </a>
            {/if}
        </div>
    </section>
    
    <!-- Filters -->
    <section class="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
        <form class="flex flex-wrap items-center gap-3">
            <div class="flex items-center gap-2 flex-1 min-w-[200px]">
                <svg class="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <label for="careerFilter" class="sr-only">Carrera</label>
                <select 
                    id="careerFilter"
                    bind:value={selectedCareerId}
                    class="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                    <option value="">Todas las carreras</option>
                    {#each careers as career}
                        <option value={career.id}>{career.name}</option>
                    {/each}
                </select>
            </div>
            <div class="flex items-center gap-2 flex-1 min-w-[150px]">
                <label for="yearFilter" class="sr-only">Año</label>
                <select 
                    id="yearFilter"
                    bind:value={selectedYear}
                    class="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                    <option value="">Todos los años</option>
                    {#each availableYears() as year}
                        <option value={year}>{year}° Año</option>
                    {/each}
                </select>
            </div>
            {#if hasActiveFilters}
                <a href="/correlatividades" class="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 transition-all hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500/50">
                    Limpiar
                </a>
            {/if}
        </form>
    </section>
    
    <!-- Tabla de Correlatividades -->
    <section class="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
        {#if filteredSubjects.length === 0}
            <div class="rounded-xl border border-slate-800 bg-slate-900/50 p-12 text-center">
                <div class="flex flex-col items-center gap-4">
                    <div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-800">
                        <svg class="h-8 w-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                        </svg>
                    </div>
                    <div class="space-y-1">
                        <p class="text-sm font-medium text-white">No hay materias registradas</p>
                        <p class="text-sm text-slate-400">Comienza agregando materias al plan de estudios</p>
                    </div>
                    {#if canManageSubjects()}
                        <a
                            href="/materias/nueva"
                            class="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition-all hover:bg-slate-100"
                        >
                            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                            </svg>
                            Nueva materia
                        </a>
                    {/if}
                </div>
            </div>
        {:else if subjects.length > 0 && filteredSubjects.length === 0}
            <div class="rounded-xl border border-slate-800 bg-slate-900/50 p-12 text-center">
                <div class="flex flex-col items-center gap-4">
                    <div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-800">
                        <svg class="h-8 w-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    <div class="space-y-1">
                        <p class="text-sm font-medium text-white">No se encontraron resultados</p>
                        <p class="text-sm text-slate-400">No hay materias que coincidan con los filtros aplicados</p>
                    </div>
                    <a href="/correlatividades" class="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-300 transition-all hover:bg-slate-700">
                        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Limpiar filtros
                    </a>
                </div>
            </div>
        {:else}
            <div class="overflow-x-auto rounded-xl border border-slate-800">
                <table class="w-full min-w-[1400px]">
                    <thead class="border-b-2 border-slate-700 bg-slate-800/50">
                        <tr>
                            <th class="px-4 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-300 border-b border-slate-700">Curso/Año</th>
                            <th class="px-4 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-300 border-b border-slate-700">Unidad Curricular</th>
                            <th class="px-4 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-300 border-b border-slate-700">Modalidad de Acreditación</th>
                            <th class="px-4 py-4 text-center text-xs font-bold uppercase tracking-wider text-slate-300 border-b border-slate-700" colspan="3">Régimen de Correlatividades</th>
                            <th class="px-4 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-300 border-b border-slate-700">Acciones</th>
                        </tr>
                        <tr class="bg-slate-800/30">
                            <th class="px-4 py-3 text-center text-xs font-semibold text-slate-400 border-b border-slate-700"></th>
                            <th class="px-4 py-3 text-center text-xs font-semibold text-slate-400 border-b border-slate-700"></th>
                            <th class="px-4 py-3 text-center text-xs font-semibold text-slate-400 border-b border-slate-700"></th>
                            <th class="px-4 py-3 text-center text-xs font-semibold text-slate-400 border-b border-slate-700">Para cursar deberá haber regularizado</th>
                            <th class="px-4 py-3 text-center text-xs font-semibold text-slate-400 border-b border-slate-700">Para cursar deberá haber aprobado</th>
                            <th class="px-4 py-3 text-center text-xs font-semibold text-slate-400 border-b border-slate-700">Para aprobar deberá haber aprobado</th>
                            <th class="px-4 py-3 text-center text-xs font-semibold text-slate-400 border-b border-slate-700"></th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-800">
                        {#each [1, 2, 3, 4] as year}
                            {@const yearSubjects = filteredSubjects.filter(s => s.yearLevel === year)}
                            {#if yearSubjects.length > 0}
                                <tr class="bg-indigo-950/20">
                                    <td colspan="7" class="px-4 py-3">
                                        <span class="inline-flex items-center gap-2 text-sm font-semibold text-indigo-300">
                                            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                            </svg>
                                            {year}° Año
                                        </span>
                                    </td>
                                </tr>
                                {#each yearSubjects as subject}
                                    {@const regularBadge = getCorrelativeBadge(subject.correlativesRegular, 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20')}
                                    {@const cursarBadge = getCorrelativeBadge(subject.correlativesAprobadoCursar, 'bg-blue-500/10 text-blue-400 border-blue-500/20')}
                                    {@const aprobarBadge = getCorrelativeBadge(subject.correlativesAprobadoAprobar, 'bg-purple-500/10 text-purple-400 border-purple-500/20')}
                                    {@const accreditationBadge = accreditationModeColors[subject.accreditationMode] || 'bg-slate-500/10 text-slate-400 border-slate-500/20'}
                                    <tr class="transition-colors hover:bg-slate-800/40">
                                        <td class="px-4 py-4">
                                            <span class="text-sm font-medium text-slate-300">{year}° Año</span>
                                        </td>
                                        <td class="px-4 py-4">
                                            <div class="min-w-0">
                                                <p class="text-sm font-semibold text-white truncate" title={subject.name}>{subject.name}</p>
                                                <p class="text-xs text-slate-500 font-mono">{subject.code}</p>
                                            </div>
                                        </td>
                                        <td class="px-4 py-4">
                                            <span class="inline-flex items-center rounded-lg border px-3 py-1.5 text-xs font-semibold {accreditationBadge}">
                                                {accreditationModeLabels[subject.accreditationMode] || subject.accreditationMode}
                                            </span>
                                        </td>
                                        <td class="px-4 py-4 text-center">
                                            <span class={regularBadge.class} title={subject.correlativesRegular.join(', ')}>{regularBadge.text}</span>
                                        </td>
                                        <td class="px-4 py-4 text-center">
                                            <span class={cursarBadge.class} title={subject.correlativesAprobadoCursar.join(', ')}>{cursarBadge.text}</span>
                                        </td>
                                        <td class="px-4 py-4 text-center">
                                            <span class={aprobarBadge.class} title={subject.correlativesAprobadoAprobar.join(', ')}>{aprobarBadge.text}</span>
                                        </td>
                                        <td class="px-4 py-4 text-right">
                                            <div class="flex items-center justify-end gap-1">
                                                <a
                                                    href={`/materias/${subject.id}`}
                                                    class="rounded-lg p-2 text-emerald-400 transition-colors hover:bg-emerald-500/10 hover:text-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                                                    aria-label="Ver detalles de materia"
                                                    title="Ver"
                                                >
                                                    <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                    </svg>
                                                </a>
                                                <a
                                                    href={`/materias/${subject.id}/correlativas`}
                                                    class="rounded-lg p-2 text-blue-400 transition-colors hover:bg-blue-500/10 hover:text-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                                    aria-label="Gestionar correlativas"
                                                    title="Correlativas"
                                                >
                                                    <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                                                    </svg>
                                                </a>
                                                {#if canManageSubjects()}
                                                    <a
                                                        href={`/materias/${subject.id}/editar`}
                                                        class="rounded-lg p-2 text-purple-400 transition-colors hover:bg-purple-500/10 hover:text-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                                                        aria-label="Editar materia"
                                                        title="Editar"
                                                    >
                                                        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                        </svg>
                                                    </a>
                                                {/if}
                                            </div>
                                        </td>
                                    </tr>
                                {/each}
                            {/if}
                        {/each}
                    </tbody>
                </table>
            </div>
        {/if}
    </section>
</div>

<!-- Modal for editing accreditation mode -->
{#if modalOpen && editingSubject}
    <div 
        role="button"
        tabindex="0"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
        onclick={closeModal}
        onkeydown={(e) => {
            if (e.key === 'Escape') closeModal();
        }}
    >
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
        <div 
            role="document"
            class="rounded-2xl border border-slate-700 bg-slate-900 p-6 w-full max-w-md mx-4"
            onclick={(e) => e.stopPropagation()}
        >
            <h2 class="mb-4 text-xl font-bold text-white">Editar Modalidad de Acreditación</h2>
            
            <p class="mb-4 text-slate-400">
                {editingSubject.name} ({editingSubject.code})
            </p>
            
            {#if form?.error}
                <div class="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-red-400">
                    {form.error}
                </div>
            {/if}
            
            {#if form?.success}
                <div class="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-emerald-400">
                    Modalidad actualizada exitosamente
                </div>
            {/if}
            
            <form method="POST" action="?/updateAccreditationMode" use:enhance>
                <input type="hidden" name="subjectId" value={editingSubject.id} />
                
                <div class="mb-4">
                    <label for="accreditationMode" class="block text-sm font-medium text-slate-300 mb-2">
                        Modalidad de Acreditación
                    </label>
                    <select 
                        id="accreditationMode"
                        name="accreditationMode"
                        class="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
                        required
                    >
                        <option value="PROMOCIONAL" selected={editingSubject.accreditationMode === 'PROMOCIONAL'}>
                            Promocional
                        </option>
                        <option value="EXAMEN_FINAL" selected={editingSubject.accreditationMode === 'EXAMEN_FINAL'}>
                            Examen Final
                        </option>
                        <option value="PROMOCIONAL_SIN_FINAL" selected={editingSubject.accreditationMode === 'PROMOCIONAL_SIN_FINAL'}>
                            Promocional sin examen final
                        </option>
                    </select>
                </div>
                
                <div class="flex justify-end gap-3">
                    <button 
                        type="button"
                        onclick={closeModal}
                        class="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
                    >
                        Cancelar
                    </button>
                    <button 
                        type="submit"
                        class="rounded-xl bg-blue-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-600"
                    >
                        Guardar
                    </button>
                </div>
            </form>
        </div>
    </div>
{/if}

<!-- Modal for adding correlatives -->
{#if correlativesModalOpen && correlativesEditingSubject}
    <div 
        role="button"
        tabindex="0"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
        onclick={closeCorrelativesModal}
        onkeydown={(e) => {
            if (e.key === 'Escape') closeCorrelativesModal();
        }}
    >
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
        <div 
            role="document"
            class="rounded-2xl border border-slate-700 bg-slate-900 p-6 w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto"
            onclick={(e) => e.stopPropagation()}
        >
            <h2 class="mb-4 text-xl font-bold text-white">Agregar Correlativa</h2>
            
            <p class="mb-4 text-slate-400">
                {correlativesEditingSubject.name} ({correlativesEditingSubject.code})
            </p>
            
            <div class="mb-4">
                <h3 class="block text-sm font-medium text-slate-300 mb-3">Tipo de Correlativa</h3>
                <div class="space-y-2">
                    <label class="flex items-center cursor-pointer rounded-lg border border-slate-700 bg-slate-800/50 p-3 hover:bg-slate-800 transition">
                        <input 
                            type="radio" 
                            name="correlativeType" 
                            value="REGULAR" 
                            bind:group={correlativesType}
                            class="mr-3 text-blue-500 focus:ring-blue-500 focus:ring-offset-slate-900"
                        />
                        <span class="text-white text-sm">Para cursar deberá haber Regularizado</span>
                    </label>
                    <label class="flex items-center cursor-pointer rounded-lg border border-slate-700 bg-slate-800/50 p-3 hover:bg-slate-800 transition">
                        <input 
                            type="radio" 
                            name="correlativeType" 
                            value="APROBADO" 
                            bind:group={correlativesType}
                            class="mr-3 text-blue-500 focus:ring-blue-500 focus:ring-offset-slate-900"
                        />
                        <span class="text-white text-sm">Para cursar deberá haber Aprobado</span>
                    </label>
                    <label class="flex items-center cursor-pointer rounded-lg border border-slate-700 bg-slate-800/50 p-3 hover:bg-slate-800 transition">
                        <input 
                            type="radio" 
                            name="correlativeType" 
                            value="APROBADO_APROBAR" 
                            bind:group={correlativesType}
                            class="mr-3 text-blue-500 focus:ring-blue-500 focus:ring-offset-slate-900"
                        />
                        <span class="text-white text-sm">Para aprobar deberá haber Aprobado</span>
                    </label>
                </div>
            </div>
            
            {#if form?.error}
                <div class="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-red-400">
                    {form.error}
                </div>
            {/if}
            
            {#if form?.success}
                <div class="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-emerald-400">
                    Correlativa agregada exitosamente
                </div>
            {/if}
            
            <form method="POST" action="?/addCorrelative" use:enhance>
                <input type="hidden" name="subjectId" value={correlativesEditingSubject.id} />
                <input type="hidden" name="correlativeType" value={correlativesType} />
                
                <div class="mb-4">
                    <label for="searchSubjects" class="block text-sm font-medium text-slate-300 mb-2">
                        Buscar Materia
                    </label>
                    <input 
                        type="text"
                        id="searchSubjects"
                        bind:value={correlativesSearch}
                        placeholder="Escribe para buscar..."
                        class="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                    />
                </div>
                
                <div class="mb-4">
                    <label for="requiredSubjectId" class="block text-sm font-medium text-slate-300 mb-2">
                        Materia Requerida
                    </label>
                    <select 
                        id="requiredSubjectId"
                        name="requiredSubjectId"
                        class="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
                        required
                    >
                        <option value="">Seleccionar materia...</option>
                        {#each filteredCareerSubjects() as group}
                            <optgroup label={group.career.name}>
                                {#each group.subjects as subject}
                                    <option value={subject.id}>
                                        {subject.yearLevel}° Año • {subject.code} - {subject.name}
                                    </option>
                                {/each}
                            </optgroup>
                        {/each}
                    </select>
                </div>
                
                <div class="flex justify-end gap-3">
                    <button 
                        type="button"
                        onclick={closeCorrelativesModal}
                        class="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
                    >
                        Cancelar
                    </button>
                    <button 
                        type="submit"
                        class="rounded-xl bg-blue-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-600"
                    >
                        Agregar Correlativa
                    </button>
                </div>
            </form>
        </div>
    </div>
{/if}

<!-- Create Subject Modal -->
{#if createModalOpen}
    <div 
        role="button"
        tabindex="0"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
        onclick={closeAllModals}
        onkeydown={(e) => {
            if (e.key === 'Escape') closeAllModals();
        }}
    >
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
        <div 
            role="document"
            class="rounded-2xl border border-slate-700 bg-slate-900 p-6 w-full max-w-md mx-4 max-h-[80vh] overflow-y-auto"
            onclick={(e) => e.stopPropagation()}
        >
            <h2 class="mb-4 text-xl font-bold text-white">Nueva Materia</h2>
            
            {#if form?.error}
                <div class="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-red-400">
                    {form.error}
                </div>
            {/if}
            
            {#if form?.success}
                <div class="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-emerald-400">
                    Materia creada exitosamente
                </div>
            {/if}
            
            <form method="POST" action="?/createSubject" use:enhance>
                <div class="mb-4">
                    <label for="code" class="block text-sm font-medium text-slate-300 mb-2">Código</label>
                    <input 
                        type="text"
                        id="code"
                        name="code"
                        required
                        class="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                        placeholder="MAT-XXX-1"
                    />
                </div>
                
                <div class="mb-4">
                    <label for="name" class="block text-sm font-medium text-slate-300 mb-2">Nombre</label>
                    <input 
                        type="text"
                        id="name"
                        name="name"
                        required
                        class="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                        placeholder="Nombre de la materia"
                    />
                </div>
                
                <div class="mb-4">
                    <label for="yearLevel" class="block text-sm font-medium text-slate-300 mb-2">Año</label>
                    <select 
                        id="yearLevel"
                        name="yearLevel"
                        required
                        class="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
                    >
                        <option value="1">1° Año</option>
                        <option value="2">2° Año</option>
                        <option value="3">3° Año</option>
                        <option value="4">4° Año</option>
                    </select>
                </div>
                
                <div class="mb-4">
                    <label for="accreditationMode" class="block text-sm font-medium text-slate-300 mb-2">Modalidad de Acreditación</label>
                    <select 
                        id="accreditationMode"
                        name="accreditationMode"
                        required
                        class="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
                    >
                        <option value="PROMOCIONAL">Promocional</option>
                        <option value="EXAMEN_FINAL">Examen Final</option>
                        <option value="PROMOCIONAL_SIN_FINAL">Promocional sin examen final</option>
                    </select>
                </div>
                
                <div class="mb-4">
                    <label for="subjectType" class="block text-sm font-medium text-slate-300 mb-2">Tipo de Materia</label>
                    <select 
                        id="subjectType"
                        name="subjectType"
                        required
                        class="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
                    >
                        <option value="COMMON">Común</option>
                        <option value="CAREER_SPECIFIC">Específica de Carrera</option>
                        <option value="EDI">EDI</option>
                    </select>
                </div>
                
                <div class="mb-4">
                    <label for="trainingField" class="block text-sm font-medium text-slate-300 mb-2">Campo de Formación</label>
                    <select 
                        id="trainingField"
                        name="trainingField"
                        required
                        class="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
                    >
                        <option value="GENERAL">General</option>
                        <option value="ESPECIFICA">Específica</option>
                        <option value="PRACTICA">Práctica</option>
                        <option value="EDI">EDI</option>
                    </select>
                </div>
                
                <div class="mb-4">
                    <label for="careerId" class="block text-sm font-medium text-slate-300 mb-2">Carrera</label>
                    <select 
                        id="careerId"
                        name="careerId"
                        required
                        class="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
                    >
                        <option value="">Seleccionar carrera...</option>
                        {#each careers as career}
                            <option value={career.id}>{career.name}</option>
                        {/each}
                    </select>
                </div>
                
                <div class="flex justify-end gap-3">
                    <button 
                        type="button"
                        onclick={closeAllModals}
                        class="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
                    >
                        Cancelar
                    </button>
                    <button 
                        type="submit"
                        class="rounded-xl bg-blue-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-600"
                    >
                        Crear
                    </button>
                </div>
            </form>
        </div>
    </div>
{/if}

<!-- Edit Subject Modal -->
{#if editModalOpen && crudSubject}
    <div 
        role="button"
        tabindex="0"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
        onclick={closeAllModals}
        onkeydown={(e) => {
            if (e.key === 'Escape') closeAllModals();
        }}
    >
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
        <div 
            role="document"
            class="rounded-2xl border border-slate-700 bg-slate-900 p-6 w-full max-w-md mx-4 max-h-[80vh] overflow-y-auto"
            onclick={(e) => e.stopPropagation()}
        >
            <h2 class="mb-4 text-xl font-bold text-white">Editar Materia</h2>
            
            <p class="mb-4 text-slate-400">
                {crudSubject.name} ({crudSubject.code})
            </p>
            
            {#if form?.error}
                <div class="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-red-400">
                    {form.error}
                </div>
            {/if}
            
            {#if form?.success}
                <div class="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-emerald-400">
                    Materia actualizada exitosamente
                </div>
            {/if}
            
            <form method="POST" action="?/updateSubject" use:enhance>
                <input type="hidden" name="subjectId" value={crudSubject.id} />
                
                <div class="mb-4">
                    <label for="editCode" class="block text-sm font-medium text-slate-300 mb-2">Código</label>
                    <input 
                        type="text"
                        id="editCode"
                        name="code"
                        value={crudSubject.code}
                        required
                        class="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                    />
                </div>
                
                <div class="mb-4">
                    <label for="editName" class="block text-sm font-medium text-slate-300 mb-2">Nombre</label>
                    <input 
                        type="text"
                        id="editName"
                        name="name"
                        value={crudSubject.name}
                        required
                        class="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                    />
                </div>
                
                <div class="mb-4">
                    <label for="editYearLevel" class="block text-sm font-medium text-slate-300 mb-2">Año</label>
                    <select 
                        id="editYearLevel"
                        name="yearLevel"
                        required
                        class="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
                    >
                        <option value="1" selected={crudSubject.yearLevel === 1}>1° Año</option>
                        <option value="2" selected={crudSubject.yearLevel === 2}>2° Año</option>
                        <option value="3" selected={crudSubject.yearLevel === 3}>3° Año</option>
                        <option value="4" selected={crudSubject.yearLevel === 4}>4° Año</option>
                    </select>
                </div>
                
                <div class="mb-4">
                    <label for="editAccreditationMode" class="block text-sm font-medium text-slate-300 mb-2">Modalidad de Acreditación</label>
                    <select 
                        id="editAccreditationMode"
                        name="accreditationMode"
                        required
                        class="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
                    >
                        <option value="PROMOCIONAL" selected={crudSubject.accreditationMode === 'PROMOCIONAL'}>Promocional</option>
                        <option value="EXAMEN_FINAL" selected={crudSubject.accreditationMode === 'EXAMEN_FINAL'}>Examen Final</option>
                        <option value="PROMOCIONAL_SIN_FINAL" selected={crudSubject.accreditationMode === 'PROMOCIONAL_SIN_FINAL'}>Promocional sin examen final</option>
                    </select>
                </div>
                
                <div class="flex justify-end gap-3">
                    <button 
                        type="button"
                        onclick={closeAllModals}
                        class="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
                    >
                        Cancelar
                    </button>
                    <button 
                        type="submit"
                        class="rounded-xl bg-blue-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-600"
                    >
                        Guardar
                    </button>
                </div>
            </form>
        </div>
    </div>
{/if}

<!-- Delete Confirmation Modal -->
{#if deleteModalOpen && crudSubject}
    <div 
        role="button"
        tabindex="0"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
        onclick={closeAllModals}
        onkeydown={(e) => {
            if (e.key === 'Escape') closeAllModals();
        }}
    >
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
        <div 
            role="document"
            class="rounded-2xl border border-slate-700 bg-slate-900 p-6 w-full max-w-md mx-4"
            onclick={(e) => e.stopPropagation()}
        >
            <h2 class="mb-4 text-xl font-bold text-white">Eliminar Materia</h2>
            
            <p class="mb-4 text-slate-400">
                ¿Estás seguro que deseas eliminar la materia <strong>{crudSubject.name}</strong> ({crudSubject.code})?
            </p>
            
            <p class="mb-6 text-sm text-slate-500">
                Esta acción desactivará la materia. No se eliminará permanentemente de la base de datos.
            </p>
            
            {#if form?.error}
                <div class="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-red-400">
                    {form.error}
                </div>
            {/if}
            
            {#if form?.success}
                <div class="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-emerald-400">
                    Materia eliminada exitosamente
                </div>
            {/if}
            
            <form method="POST" action="?/deleteSubject" use:enhance>
                <input type="hidden" name="subjectId" value={crudSubject.id} />
                
                <div class="flex justify-end gap-3">
                    <button 
                        type="button"
                        onclick={closeAllModals}
                        class="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
                    >
                        Cancelar
                    </button>
                    <button 
                        type="submit"
                        class="rounded-xl bg-red-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-600"
                    >
                        Eliminar
                    </button>
                </div>
            </form>
        </div>
    </div>
{/if}

<!-- View Subject Details Modal -->
{#if viewModalOpen && crudSubject}
    <div 
        role="button"
        tabindex="0"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
        onclick={closeAllModals}
        onkeydown={(e) => {
            if (e.key === 'Escape') closeAllModals();
        }}
    >
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
        <div 
            role="document"
            class="rounded-2xl border border-slate-700 bg-slate-900 p-6 w-full max-w-md mx-4 max-h-[80vh] overflow-y-auto"
            onclick={(e) => e.stopPropagation()}
        >
            <h2 class="mb-4 text-xl font-bold text-white">Detalles de Materia</h2>
            
            <div class="space-y-4">
                <div>
                    <p class="text-sm text-slate-400">Código</p>
                    <p class="text-white font-medium">{crudSubject.code}</p>
                </div>
                
                <div>
                    <p class="text-sm text-slate-400">Nombre</p>
                    <p class="text-white font-medium">{crudSubject.name}</p>
                </div>
                
                <div>
                    <p class="text-sm text-slate-400">Año</p>
                    <p class="text-white font-medium">{crudSubject.yearLevel}° Año</p>
                </div>
                
                <div>
                    <p class="text-sm text-slate-400">Modalidad de Acreditación</p>
                    <p class="text-white font-medium">{accreditationModeLabels[crudSubject.accreditationMode] || crudSubject.accreditationMode}</p>
                </div>
                
                <div>
                    <p class="text-sm text-slate-400">Carreras</p>
                    <div class="text-white">
                        {#each crudSubject.careers as career}
                            <p class="font-medium">• {career.name}</p>
                        {/each}
                    </div>
                </div>
                
                <div>
                    <p class="text-sm text-slate-400">Correlativas (Regular)</p>
                    <p class="text-white">
                        {#if crudSubject.correlativesRegular.length > 0}
                            {crudSubject.correlativesRegular.join(', ')}
                        {:else}
                            -
                        {/if}
                    </p>
                </div>
                
                <div>
                    <p class="text-sm text-slate-400">Correlativas (Aprobado para cursar)</p>
                    <p class="text-white">
                        {#if crudSubject.correlativesAprobadoCursar.length > 0}
                            {crudSubject.correlativesAprobadoCursar.join(', ')}
                        {:else}
                            -
                        {/if}
                    </p>
                </div>
                
                <div>
                    <p class="text-sm text-slate-400">Correlativas (Aprobado para aprobar)</p>
                    <p class="text-white">
                        {#if crudSubject.correlativesAprobadoAprobar.length > 0}
                            {crudSubject.correlativesAprobadoAprobar.join(', ')}
                        {:else}
                            -
                        {/if}
                    </p>
                </div>
            </div>
            
            <div class="mt-6 flex justify-end">
                <button 
                    type="button"
                    onclick={closeAllModals}
                    class="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
                >
                    Cerrar
                </button>
            </div>
        </div>
    </div>
{/if}

<!-- Edit Correlatives Modal -->
{#if editCorrelativesModalOpen && editCorrelativesSubject}
    <div 
        role="button"
        tabindex="0"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
        onclick={closeAllModals}
        onkeydown={(e) => {
            if (e.key === 'Escape') closeAllModals();
        }}
    >
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
        <div 
            role="document"
            class="rounded-2xl border border-slate-700 bg-slate-900 p-6 w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto"
            onclick={(e) => e.stopPropagation()}
        >
            <h2 class="mb-2 text-xl font-bold text-white">Editar Correlativas</h2>
            <p class="mb-4 text-slate-400">{editCorrelativesSubject.name} ({editCorrelativesSubject.code})</p>
            
            {#if form?.error}
                <div class="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-red-400">
                    {form.error}
                </div>
            {/if}
            
            {#if form?.success}
                <div class="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-emerald-400">
                    Cambios guardados exitosamente
                </div>
            {/if}
            
            <div class="space-y-6">
                <!-- Correlativas REGULAR -->
                <div>
                    <h3 class="mb-2 text-sm font-medium text-emerald-400">Para cursar deberá haber Regularizado</h3>
                    {#if editCorrelativesSubject.correlativesRegular.length > 0}
                        <div class="space-y-2">
                            {#each editCorrelativesSubject.correlativesRegular as corrName}
                                <div class="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-2">
                                    <span class="text-white">{corrName}</span>
                                    <form method="POST" action="?/removeCorrelative" use:enhance class="inline">
                                        <input type="hidden" name="subjectId" value={editCorrelativesSubject.id} />
                                        <input type="hidden" name="requiredSubjectName" value={corrName} />
                                        <input type="hidden" name="correlativeType" value="REGULAR" />
                                        <button 
                                            type="submit"
                                            class="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs text-red-400 hover:bg-red-500/20"
                                        >
                                            Eliminar
                                        </button>
                                    </form>
                                </div>
                            {/each}
                        </div>
                    {:else}
                        <p class="text-sm text-slate-500">No hay correlativas de este tipo</p>
                    {/if}
                </div>
                
                <!-- Correlativas APROBADO (para cursar) -->
                <div>
                    <h3 class="mb-2 text-sm font-medium text-blue-400">Para cursar deberá haber Aprobado</h3>
                    {#if editCorrelativesSubject.correlativesAprobadoCursar.length > 0}
                        <div class="space-y-2">
                            {#each editCorrelativesSubject.correlativesAprobadoCursar as corrName}
                                <div class="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-2">
                                    <span class="text-white">{corrName}</span>
                                    <form method="POST" action="?/removeCorrelative" use:enhance class="inline">
                                        <input type="hidden" name="subjectId" value={editCorrelativesSubject.id} />
                                        <input type="hidden" name="requiredSubjectName" value={corrName} />
                                        <input type="hidden" name="correlativeType" value="APROBADO" />
                                        <button 
                                            type="submit"
                                            class="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs text-red-400 hover:bg-red-500/20"
                                        >
                                            Eliminar
                                        </button>
                                    </form>
                                </div>
                            {/each}
                        </div>
                    {:else}
                        <p class="text-sm text-slate-500">No hay correlativas de este tipo</p>
                    {/if}
                </div>
                
                <!-- Correlativas APROBADO_APROBAR -->
                <div>
                    <h3 class="mb-2 text-sm font-medium text-rose-400">Para aprobar deberá haber Aprobado</h3>
                    {#if editCorrelativesSubject.correlativesAprobadoAprobar.length > 0}
                        <div class="space-y-2">
                            {#each editCorrelativesSubject.correlativesAprobadoAprobar as corrName}
                                <div class="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-2">
                                    <span class="text-white">{corrName}</span>
                                    <form method="POST" action="?/removeCorrelative" use:enhance class="inline">
                                        <input type="hidden" name="subjectId" value={editCorrelativesSubject.id} />
                                        <input type="hidden" name="requiredSubjectName" value={corrName} />
                                        <input type="hidden" name="correlativeType" value="APROBADO_APROBAR" />
                                        <button 
                                            type="submit"
                                            class="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs text-red-400 hover:bg-red-500/20"
                                        >
                                            Eliminar
                                        </button>
                                    </form>
                                </div>
                            {/each}
                        </div>
                    {:else}
                        <p class="text-sm text-slate-500">No hay correlativas de este tipo</p>
                    {/if}
                </div>
            </div>
            
            <div class="mt-6 flex justify-end gap-3">
                <button 
                    type="button"
                    onclick={() => {
                        correlativesEditingSubject = editCorrelativesSubject;
                        correlativesModalOpen = true;
                    }}
                    class="rounded-xl bg-blue-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-600"
                >
                    + Agregar Correlativa
                </button>
                <button 
                    type="button"
                    onclick={closeAllModals}
                    class="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
                >
                    Cerrar
                </button>
            </div>
        </div>
    </div>
{/if}
