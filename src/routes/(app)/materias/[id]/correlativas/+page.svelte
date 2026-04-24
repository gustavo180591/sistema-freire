<script lang="ts">
    import { enhance } from '$app/forms';
    
    let { data, form } = $props();
    
    const subject = $derived(data.subject);
    const availableSubjects = $derived(data.availableSubjects);
    const careers = $derived(data.careers);
    
    const correlativeTypeLabels: Record<string, string> = {
        REGULAR: 'Para cursar regular',
        APROBADO: 'Requiere aprobación final',
        LIBRE: 'Para cursar libre',
        EQUIVALENCIA: 'Equivalencia',
        APROBADO_APROBAR: 'Para aprobar deberá'
    };
    
    const correlativeTypeColors: Record<string, string> = {
        REGULAR: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
        APROBADO: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
        LIBRE: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
        EQUIVALENCIA: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
        APROBADO_APROBAR: 'bg-rose-500/20 text-rose-300 border-rose-500/30'
    };
    
    const trainingFieldColors: Record<string, string> = {
        GENERAL: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
        ESPECIFICA: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
        PRACTICA: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
        EDI: 'bg-purple-500/20 text-purple-300 border-purple-500/30'
    };
    
    // Contadores de correlativas por tipo
    const regularCount = $derived(
        subject.correlatives.filter((c: { correlativeType: string }) => c.correlativeType === 'REGULAR').length
    );
    const aprobadoCursarCount = $derived(
        subject.correlatives.filter((c: { correlativeType: string }) => c.correlativeType === 'APROBADO').length
    );
    const aprobadoAprobarCount = $derived(
        subject.correlatives.filter((c: { correlativeType: string }) => c.correlativeType === 'APROBADO_APROBAR').length
    );
    
    // Búsqueda de materias
    let searchTerm = $state('');
    const filteredSubjects = $derived(
        availableSubjects.filter((s: { name: string; code: string }) => 
            s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.code.toLowerCase().includes(searchTerm.toLowerCase())
        )
    );
</script>

<svelte:head>
    <title>Correlativas | {subject.name}</title>
</svelte:head>

<div class="space-y-6">
    <!-- Header -->
    <section class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
        <div class="mb-4">
            <a href="/materias/{subject.id}/editar" class="text-sm text-slate-400 hover:text-slate-300">
                ← Volver a editar materia
            </a>
        </div>
        <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
                <p class="text-sm tracking-[0.2em] text-slate-400 uppercase">Correlativas</p>
                <h1 class="mt-2 text-3xl font-bold">{subject.name}</h1>
                <p class="mt-1 font-mono text-sm text-slate-400">{subject.code} • Año {subject.yearLevel}</p>
            </div>
            <div class="flex gap-2">
                <a 
                    href="/materias/{subject.id}"
                    class="rounded-xl border border-slate-700 px-4 py-2 text-sm hover:border-slate-500"
                >
                    Ver Materia
                </a>
            </div>
        </div>
    </section>
    
    {#if form?.error}
        <div class="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-400">
            {form.error}
        </div>
    {/if}
    
    {#if form?.success}
        <div class="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-400">
            Cambios guardados exitosamente
        </div>
    {/if}
    
    <!-- Régimen de Correlatividades -->
    <section class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
        <h2 class="mb-4 text-xl font-bold">Régimen de Correlatividades</h2>
        
        <!-- Tabla de correlativas -->
        <div class="mb-6 overflow-hidden rounded-2xl border border-slate-800">
            <table class="w-full text-left">
                <thead class="border-b border-slate-800 bg-slate-900">
                    <tr class="border-b border-slate-700">
                        <th rowspan="2" class="px-4 py-3 text-sm font-semibold border-r border-slate-700">Materia Requerida</th>
                        <th colspan="2" class="px-4 py-2 text-sm font-semibold text-center border-r border-slate-700">Para cursar deberá</th>
                        <th rowspan="2" class="px-4 py-3 text-sm font-semibold text-center border-r border-slate-700">Para aprobar deberá<br/>haber Aprobado</th>
                        <th rowspan="2" class="px-4 py-3 text-center text-sm font-semibold">Acción</th>
                    </tr>
                    <tr>
                        <th class="px-4 py-2 text-xs font-semibold text-center border-r border-slate-700">haber Regularizado</th>
                        <th class="px-4 py-2 text-xs font-semibold text-center border-r border-slate-700">haber Aprobado</th>
                    </tr>
                </thead>
                <tbody>
                    {#if subject.correlatives.length > 0}
                        {#each subject.correlatives as corr}
                            <tr class="border-b border-slate-800 last:border-none hover:bg-slate-800/50">
                                <td class="px-4 py-4 border-r border-slate-700">
                                    <p class="font-medium">{corr.requiredSubject.name}</p>
                                    <p class="text-sm text-slate-400">{corr.requiredSubject.code} • Año {corr.requiredSubject.yearLevel}</p>
                                    {#if corr.career}
                                        <p class="text-xs text-slate-500 mt-1">Solo: {corr.career.code}</p>
                                    {/if}
                                </td>
                                <td class="px-4 py-4 text-center border-r border-slate-700">
                                    {#if corr.correlativeType === 'REGULAR'}
                                        <span class="text-emerald-400 text-lg">✓</span>
                                    {:else}
                                        <span class="text-slate-600">-</span>
                                    {/if}
                                </td>
                                <td class="px-4 py-4 text-center border-r border-slate-700">
                                    {#if corr.correlativeType === 'APROBADO'}
                                        <span class="text-blue-400 text-lg">✓</span>
                                    {:else}
                                        <span class="text-slate-600">-</span>
                                    {/if}
                                </td>
                                <td class="px-4 py-4 text-center border-r border-slate-700">
                                    {#if corr.correlativeType === 'APROBADO_APROBAR'}
                                        <span class="text-rose-400 text-lg">✓</span>
                                    {:else}
                                        <span class="text-slate-600">-</span>
                                    {/if}
                                </td>
                                <td class="px-4 py-4 text-center">
                                    <form method="POST" action="?/removeCorrelative" use:enhance>
                                        <input type="hidden" name="correlativeId" value={corr.id} />
                                        <button 
                                            type="submit"
                                            class="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400 hover:bg-red-500/20"
                                        >
                                            Eliminar
                                        </button>
                                    </form>
                                </td>
                            </tr>
                        {/each}
                    {:else}
                        <tr>
                            <td colspan="5" class="px-4 py-8 text-center text-slate-400">
                                Esta materia no tiene correlativas definidas.
                            </td>
                        </tr>
                    {/if}
                </tbody>
            </table>
        </div>
        
        <!-- Resumen en cards -->
        <div class="grid gap-4 md:grid-cols-3">
            <div class="rounded-xl border border-slate-800 bg-slate-800/30 p-4">
                <p class="text-sm text-slate-400">Para cursar regular</p>
                <h3 class="mt-2 text-2xl font-bold text-emerald-400">{regularCount}</h3>
                <p class="text-xs text-slate-500">Haber regularizado</p>
            </div>
            <div class="rounded-xl border border-slate-800 bg-slate-800/30 p-4">
                <p class="text-sm text-slate-400">Para cursar (con final)</p>
                <h3 class="mt-2 text-2xl font-bold text-blue-400">{aprobadoCursarCount}</h3>
                <p class="text-xs text-slate-500">Haber aprobado</p>
            </div>
            <div class="rounded-xl border border-slate-800 bg-slate-800/30 p-4">
                <p class="text-sm text-slate-400">Para aprobar esta</p>
                <h3 class="mt-2 text-2xl font-bold text-purple-400">{aprobadoAprobarCount}</h3>
                <p class="text-xs text-slate-500">Haber aprobado otras</p>
            </div>
        </div>
    </section>
    
    <!-- Materias que la requieren -->
    {#if subject.requiredBy.length > 0}
        <section class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
            <h2 class="mb-4 text-xl font-bold">Materias que requieren esta</h2>
            
            <div class="space-y-3">
                {#each subject.requiredBy as req}
                    <div class="flex items-center gap-4 rounded-xl border border-slate-800 bg-slate-800/30 p-4">
                        <div class="flex-1">
                            <p class="font-medium">{req.subject.name}</p>
                            <p class="text-sm text-slate-400">{req.subject.code} • Año {req.subject.yearLevel}</p>
                        </div>
                        <span class="rounded-full border px-3 py-1 text-xs {correlativeTypeColors[req.correlativeType]}">
                            {correlativeTypeLabels[req.correlativeType]}
                        </span>
                        {#if req.career}
                            <span class="text-xs text-slate-400">Solo: {req.career.code}</span>
                        {/if}
                    </div>
                {/each}
            </div>
        </section>
    {/if}
    
    <!-- Agregar Nueva Correlativa -->
    <section class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
        <h2 class="mb-4 text-xl font-bold">Agregar Correlativa</h2>
        
        <form method="POST" action="?/addCorrelative" use:enhance class="space-y-4">
            <div class="grid gap-4 md:grid-cols-2">
                <!-- Materia Requerida -->
                <div class="space-y-2 md:col-span-2">
                    <label for="requiredSubjectId" class="text-sm font-medium text-slate-300">Materia Requerida</label>
                    
                    <!-- Buscador -->
                    <input
                        type="text"
                        placeholder="Buscar materia por nombre o código..."
                        bind:value={searchTerm}
                        class="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
                    />
                    
                    <select 
                        id="requiredSubjectId"
                        name="requiredSubjectId" 
                        class="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
                        required
                    >
                        <option value="">Seleccionar materia...</option>
                        {#each filteredSubjects as subj}
                            <option value={subj.id}>
                                {subj.yearLevel}° Año • {subj.code} - {subj.name}
                                {#if subj.careerSubjects.length > 0}
                                    ({subj.careerSubjects.map((cs: { career: { code: string } }) => cs.career.code).join(', ')})
                                {:else}
                                    (Común)
                                {/if}
                            </option>
                        {/each}
                    </select>
                    {#if searchTerm && filteredSubjects.length === 0}
                        <p class="text-xs text-slate-400">No se encontraron materias con "{searchTerm}"</p>
                    {/if}
                </div>
                
                <!-- Tipo de Correlativa -->
                <div class="space-y-2">
                    <label for="correlativeType" class="text-sm font-medium text-slate-300">Tipo de Requisito</label>
                    <select 
                        id="correlativeType"
                        name="correlativeType" 
                        class="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
                        required
                    >
                        <optgroup label="Para cursar deberá">
                            <option value="REGULAR">haber Regularizado</option>
                            <option value="APROBADO">haber Aprobado</option>
                            <option value="LIBRE">haber Regularizado (curso libre)</option>
                        </optgroup>
                        <optgroup label="Para aprobar deberá">
                            <option value="APROBADO_APROBAR">haber Aprobado</option>
                        </optgroup>
                        <optgroup label="Equivalencias">
                            <option value="EQUIVALENCIA">Equivalencia con otra materia</option>
                        </optgroup>
                    </select>
                </div>
                
                <!-- Carrera Específica (opcional) -->
                <div class="space-y-2">
                    <label for="careerId" class="text-sm font-medium text-slate-300">Aplicar solo a Carrera (opcional)</label>
                    <select 
                        id="careerId"
                        name="careerId" 
                        class="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
                    >
                        <option value="">Todas las carreras</option>
                        {#each careers as career}
                            <option value={career.id}>{career.name} ({career.code})</option>
                        {/each}
                    </select>
                </div>
            </div>
            
            <div class="flex justify-end">
                <button 
                    type="submit"
                    class="rounded-xl bg-blue-500 px-6 py-3 text-sm font-medium text-white hover:bg-blue-600 transition"
                >
                    + Agregar Correlativa
                </button>
            </div>
        </form>
    </section>
</div>
