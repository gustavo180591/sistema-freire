<script lang="ts">
    import { enhance } from '$app/forms';
    
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
        
        // Only show subjects from the same careers as the editing subject
        return correlativesEditingSubject.careers.map(career => ({
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
    <section class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
        <div class="flex items-center justify-between">
            <h1 class="text-3xl font-bold">Correlatividades</h1>
            <button 
                onclick={openCreateModal}
                class="rounded-xl bg-blue-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-600"
            >
                + Nueva Materia
            </button>
        </div>
        <p class="mt-2 text-slate-400">Gestión de correlatividades del plan de estudios</p>
    </section>
    
    <!-- Filters -->
    <section class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
        <div class="flex gap-4 flex-wrap">
            <div class="flex-1 min-w-[200px]">
                <label for="careerFilter" class="block text-sm font-medium text-slate-300 mb-2">Carrera</label>
                <select 
                    id="careerFilter"
                    bind:value={selectedCareerId}
                    class="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
                >
                    <option value="">Todas las carreras</option>
                    {#each careers as career}
                        <option value={career.id}>{career.name} ({career.code})</option>
                    {/each}
                </select>
            </div>
            <div class="flex-1 min-w-[200px]">
                <label for="yearFilter" class="block text-sm font-medium text-slate-300 mb-2">Año</label>
                <select 
                    id="yearFilter"
                    bind:value={selectedYear}
                    class="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
                >
                    <option value="">Todos los años</option>
                    {#each availableYears() as year}
                        <option value={year}>{year}° Año</option>
                    {/each}
                </select>
            </div>
        </div>
    </section>
    
    <!-- Tabla de Correlatividades -->
    <section class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
        <div class="overflow-x-auto">
            <table class="w-full border-collapse">
                <thead>
                    <!-- Primera fila de encabezados -->
                    <tr class="border-b-2 border-slate-600">
                        <th rowspan="3" class="border border-slate-400 bg-slate-700 px-4 py-3 text-sm font-semibold text-center text-white">
                            Curso
                        </th>
                        <th rowspan="3" class="border border-slate-400 bg-slate-700 px-4 py-3 text-sm font-semibold text-center text-white">
                            Unidad Curricular
                        </th>
                        <th rowspan="3" class="border border-slate-400 bg-slate-700 px-4 py-3 text-sm font-semibold text-center text-white">
                            Modalidad de Acreditación
                        </th>
                        <th colspan="3" class="border border-slate-400 bg-indigo-600 px-4 py-3 text-sm font-semibold text-center text-white">
                            Régimen de Correlatividades
                        </th>
                        <th rowspan="3" class="border border-slate-400 bg-slate-700 px-4 py-3 text-sm font-semibold text-center text-white">
                            Acciones
                        </th>
                    </tr>
                    
                    <!-- Segunda fila de encabezados -->
                    <tr class="border-b-2 border-slate-600">
                        <th colspan="2" class="border border-slate-400 bg-slate-600 px-4 py-2 text-xs font-semibold text-center text-white">
                            Para cursar deberá
                        </th>
                        <th rowspan="2" class="border border-slate-400 bg-slate-600 px-4 py-2 text-xs font-semibold text-center text-white">
                            Para aprobar deberá
                        </th>
                    </tr>
                    
                    <!-- Tercera fila de encabezados -->
                    <tr class="border-b-2 border-slate-600">
                        <th class="border border-slate-400 bg-slate-600 px-4 py-2 text-xs font-semibold text-center text-white">
                            haber Regularizado
                        </th>
                        <th class="border border-slate-400 bg-slate-600 px-4 py-2 text-xs font-semibold text-center text-white">
                            haber Aprobado
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {#each filteredSubjects as subject}
                        <tr class="border-b border-slate-400">
                            <td class="border border-slate-400 px-4 py-3 text-center text-sm text-white">
                                {subject.yearLevel}° Año
                            </td>
                            <td class="border border-slate-400 px-4 py-3 text-sm text-white">
                                <p class="font-medium">{subject.name}</p>
                                <p class="text-xs text-slate-400">{subject.code}</p>
                            </td>
                            <td 
                                class="border border-slate-400 px-4 py-3 text-center text-sm text-white cursor-pointer hover:bg-slate-700/50 transition"
                                onclick={() => openModal(subject)}
                            >
                                {accreditationModeLabels[subject.accreditationMode] || subject.accreditationMode}
                            </td>
                            <td 
                                class="border border-slate-400 px-4 py-3 text-center text-sm text-white cursor-pointer hover:bg-slate-700/50 transition"
                                onclick={() => openCorrelativesModal(subject, 'REGULAR')}
                            >
                                {#if subject.correlativesRegular.length > 0}
                                    {subject.correlativesRegular.join(', ')}
                                {:else}
                                    -
                                {/if}
                            </td>
                            <td 
                                class="border border-slate-400 px-4 py-3 text-center text-sm text-white cursor-pointer hover:bg-slate-700/50 transition"
                                onclick={() => openCorrelativesModal(subject, 'APROBADO')}
                            >
                                {#if subject.correlativesAprobadoCursar.length > 0}
                                    {subject.correlativesAprobadoCursar.join(', ')}
                                {:else}
                                    -
                                {/if}
                            </td>
                            <td 
                                class="border border-slate-400 px-4 py-3 text-center text-sm text-white cursor-pointer hover:bg-slate-700/50 transition"
                                onclick={() => openCorrelativesModal(subject, 'APROBADO_APROBAR')}
                            >
                                {#if subject.correlativesAprobadoAprobar.length > 0}
                                    {subject.correlativesAprobadoAprobar.join(', ')}
                                {:else}
                                    -
                                {/if}
                            </td>
                            <td class="border border-slate-400 px-4 py-3 text-center">
                                <div class="flex justify-center gap-1">
                                    <button 
                                        onclick={() => openViewModal(subject)}
                                        class="inline-block rounded-lg border border-slate-600 px-2 py-1.5 text-xs font-medium text-white transition hover:bg-slate-700 hover:border-slate-500"
                                        title="Ver"
                                    >
                                        👁
                                    </button>
                                    <button 
                                        onclick={() => openEditCorrelativesModal(subject)}
                                        class="inline-block rounded-lg border border-slate-600 px-2 py-1.5 text-xs font-medium text-white transition hover:bg-slate-700 hover:border-slate-500"
                                        title="Editar Correlativas"
                                    >
                                        ✏
                                    </button>
                                    <button 
                                        onclick={() => openDeleteModal(subject)}
                                        class="inline-block rounded-lg border border-red-600 px-2 py-1.5 text-xs font-medium text-white transition hover:bg-red-700 hover:border-red-500"
                                        title="Eliminar"
                                    >
                                        🗑
                                    </button>
                                </div>
                            </td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        </div>
    </section>
</div>

<!-- Modal for editing accreditation mode -->
{#if modalOpen && editingSubject}
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onclick={closeModal}>
        <div class="rounded-2xl border border-slate-700 bg-slate-900 p-6 w-full max-w-md mx-4" onclick={(e) => e.stopPropagation()}>
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
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onclick={closeCorrelativesModal}>
        <div class="rounded-2xl border border-slate-700 bg-slate-900 p-6 w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto" onclick={(e) => e.stopPropagation()}>
            <h2 class="mb-4 text-xl font-bold text-white">Agregar Correlativa</h2>
            
            <p class="mb-4 text-slate-400">
                {correlativesEditingSubject.name} ({correlativesEditingSubject.code})
            </p>
            
            <p class="mb-4 text-sm text-slate-300">
                Tipo: {correlativesType === 'REGULAR' ? 'Para cursar deberá haber Regularizado' : correlativesType === 'APROBADO' ? 'Para cursar deberá haber Aprobado' : 'Para aprobar deberá haber Aprobado'}
            </p>
            
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
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onclick={closeAllModals}>
        <div class="rounded-2xl border border-slate-700 bg-slate-900 p-6 w-full max-w-md mx-4 max-h-[80vh] overflow-y-auto" onclick={(e) => e.stopPropagation()}>
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
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onclick={closeAllModals}>
        <div class="rounded-2xl border border-slate-700 bg-slate-900 p-6 w-full max-w-md mx-4 max-h-[80vh] overflow-y-auto" onclick={(e) => e.stopPropagation()}>
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
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onclick={closeAllModals}>
        <div class="rounded-2xl border border-slate-700 bg-slate-900 p-6 w-full max-w-md mx-4" onclick={(e) => e.stopPropagation()}>
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
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onclick={closeAllModals}>
        <div class="rounded-2xl border border-slate-700 bg-slate-900 p-6 w-full max-w-md mx-4 max-h-[80vh] overflow-y-auto" onclick={(e) => e.stopPropagation()}>
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
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onclick={closeAllModals}>
        <div class="rounded-2xl border border-slate-700 bg-slate-900 p-6 w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto" onclick={(e) => e.stopPropagation()}>
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
