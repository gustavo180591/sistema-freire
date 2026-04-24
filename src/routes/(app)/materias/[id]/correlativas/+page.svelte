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
        EQUIVALENCIA: 'Equivalencia'
    };
    
    const correlativeTypeColors: Record<string, string> = {
        REGULAR: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
        APROBADO: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
        LIBRE: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
        EQUIVALENCIA: 'bg-purple-500/20 text-purple-300 border-purple-500/30'
    };
    
    const trainingFieldColors: Record<string, string> = {
        GENERAL: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
        ESPECIFICA: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
        PRACTICA: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
        EDI: 'bg-purple-500/20 text-purple-300 border-purple-500/30'
    };
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
    
    <!-- Correlativas Actuales -->
    <section class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
        <h2 class="mb-4 text-xl font-bold">Materias que requiere esta correlativa</h2>
        
        {#if subject.correlatives.length > 0}
            <div class="space-y-3">
                {#each subject.correlatives as corr}
                    <div class="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-800/50 p-4">
                        <div class="flex items-center gap-4">
                            <div>
                                <p class="font-medium">{corr.requiredSubject.name}</p>
                                <p class="text-sm text-slate-400">{corr.requiredSubject.code} • Año {corr.requiredSubject.yearLevel}</p>
                            </div>
                            <span class="rounded-full border px-3 py-1 text-xs {correlativeTypeColors[corr.correlativeType]}">
                                {correlativeTypeLabels[corr.correlativeType]}
                            </span>
                            {#if corr.career}
                                <span class="text-xs text-slate-400">Solo para: {corr.career.code}</span>
                            {/if}
                        </div>
                        <form method="POST" action="?/removeCorrelative" use:enhance>
                            <input type="hidden" name="correlativeId" value={corr.id} />
                            <button 
                                type="submit"
                                class="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400 hover:bg-red-500/20"
                            >
                                Eliminar
                            </button>
                        </form>
                    </div>
                {/each}
            </div>
        {:else}
            <p class="text-slate-400">Esta materia no tiene correlativas definidas.</p>
        {/if}
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
                    <select 
                        id="requiredSubjectId"
                        name="requiredSubjectId" 
                        class="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
                        required
                    >
                        <option value="">Seleccionar materia...</option>
                        {#each availableSubjects as subj}
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
                        <option value="REGULAR">Para cursar regular</option>
                        <option value="APROBADO">Requiere aprobación final</option>
                        <option value="LIBRE">Para cursar libre</option>
                        <option value="EQUIVALENCIA">Equivalencia</option>
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
