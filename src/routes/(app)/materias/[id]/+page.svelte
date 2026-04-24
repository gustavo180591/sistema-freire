<script lang="ts">
    let { data } = $props();
    
    const subject = $derived(data.subject);
    
    const subjectTypeLabels: Record<string, string> = {
        COMMON: 'Común',
        CAREER_SPECIFIC: 'Específica de Carrera',
        EDI: 'EDI'
    };
    
    const trainingFieldLabels: Record<string, string> = {
        GENERAL: 'Formación General',
        ESPECIFICA: 'Formación Específica',
        PRACTICA: 'Práctica Profesionalizante',
        EDI: 'Espacios de Definición Institucional'
    };
    
    const trainingFieldColors: Record<string, string> = {
        GENERAL: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
        ESPECIFICA: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
        PRACTICA: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
        EDI: 'bg-purple-500/20 text-purple-300 border-purple-500/30'
    };
    
    const accreditationModeLabels: Record<string, string> = {
        PROMOCIONAL: 'Promocional',
        EXAMEN_FINAL: 'Examen Final',
        PROMOCIONAL_SIN_FINAL: 'Promocional sin Final'
    };
    
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
</script>

<svelte:head>
    <title>{subject.name} | Materia</title>
</svelte:head>

<div class="space-y-8">
    <!-- Header -->
    <section class="rounded-3xl border border-slate-800 bg-slate-900/70 p-8">
        <div class="mb-6">
            <a href="/materias" class="text-sm text-slate-400 transition hover:text-slate-300">
                ← Volver a materias
            </a>
        </div>
        <div class="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
                <div class="flex items-center gap-3 mb-2">
                    <span class="rounded-full border px-3 py-1 text-xs {trainingFieldColors[subject.trainingField]}">
                        {trainingFieldLabels[subject.trainingField]}
                    </span>
                    <span class="text-sm text-slate-400">{subjectTypeLabels[subject.subjectType]}</span>
                </div>
                <h1 class="text-4xl font-bold tracking-tight">{subject.name}</h1>
                <p class="mt-2 font-mono text-sm text-slate-400">{subject.code} • {subject.yearLevel}° Año</p>
            </div>
            <div class="flex gap-2">
                <a 
                    href="/materias/{subject.id}/correlativas"
                    class="rounded-xl border border-slate-700 px-4 py-2 text-sm hover:border-slate-500"
                >
                    Correlativas
                </a>
                <a 
                    href="/materias/{subject.id}/editar"
                    class="rounded-2xl bg-white px-6 py-3 font-semibold text-slate-950 transition hover:scale-[1.02]"
                >
                    Editar
                </a>
            </div>
        </div>
        
        {#if subject.description}
            <p class="mt-6 text-slate-300">{subject.description}</p>
        {/if}
    </section>

    <!-- Info Cards -->
    <section class="grid gap-4 md:grid-cols-4">
        <div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
            <p class="text-sm text-slate-400">Modalidad</p>
            <h2 class="mt-3 text-2xl font-bold">{accreditationModeLabels[subject.accreditationMode]}</h2>
        </div>

        <div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
            <p class="text-sm text-slate-400">Horas Semanales</p>
            <h2 class="mt-3 text-2xl font-bold">{subject.hoursPerWeek || '-'}</h2>
        </div>

        <div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
            <p class="text-sm text-slate-400">Correlativas</p>
            <h2 class="mt-3 text-2xl font-bold">{subject.correlatives.length}</h2>
        </div>

        <div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
            <p class="text-sm text-slate-400">Comisiones</p>
            <h2 class="mt-3 text-2xl font-bold">{subject.commissions.length}</h2>
        </div>
    </section>

    <!-- Carreras -->
    <section class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
        <h2 class="mb-4 text-xl font-bold">Carreras que incluyen esta materia</h2>
        
        {#if subject.careerSubjects.length > 0}
            <div class="grid gap-3 md:grid-cols-2">
                {#each subject.careerSubjects as cs}
                    <a 
                        href="/carreras/{cs.career.id}"
                        class="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-800/30 p-4 transition hover:border-slate-600"
                    >
                        <div>
                            <p class="font-medium">{cs.career.name}</p>
                            <p class="text-sm text-slate-400">{cs.career.code} • Año {cs.yearLevel}</p>
                        </div>
                        <span class="text-slate-500">→</span>
                    </a>
                {/each}
            </div>
        {:else}
            <p class="text-slate-400">Esta materia no está asociada a ninguna carrera específica.</p>
        {/if}
    </section>

    <!-- Correlativas que requiere -->
    {#if subject.correlatives.length > 0}
        <section class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
            <h2 class="mb-4 text-xl font-bold">Materias requeridas para cursar esta</h2>
            
            <div class="space-y-3">
                {#each subject.correlatives as corr}
                    <div class="flex items-center gap-4 rounded-xl border border-slate-800 bg-slate-800/30 p-4">
                        <div class="flex-1">
                            <a 
                                href="/materias/{corr.requiredSubject.id}"
                                class="font-medium hover:text-blue-400 transition"
                            >
                                {corr.requiredSubject.name}
                            </a>
                            <p class="text-sm text-slate-400">{corr.requiredSubject.code} • Año {corr.requiredSubject.yearLevel}</p>
                        </div>
                        <span class="rounded-full border px-3 py-1 text-xs {correlativeTypeColors[corr.correlativeType]}">
                            {correlativeTypeLabels[corr.correlativeType]}
                        </span>
                        {#if corr.career}
                            <span class="text-xs text-slate-400">Solo: {corr.career.code}</span>
                        {/if}
                    </div>
                {/each}
            </div>
        </section>
    {/if}

    <!-- Materias que la requieren -->
    {#if subject.requiredBy.length > 0}
        <section class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
            <h2 class="mb-4 text-xl font-bold">Materias que requieren esta</h2>
            
            <div class="space-y-3">
                {#each subject.requiredBy as req}
                    <div class="flex items-center gap-4 rounded-xl border border-slate-800 bg-slate-800/30 p-4">
                        <div class="flex-1">
                            <a 
                                href="/materias/{req.subject.id}"
                                class="font-medium hover:text-blue-400 transition"
                            >
                                {req.subject.name}
                            </a>
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

    <!-- Comisiones -->
    {#if subject.commissions.length > 0}
        <section class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
            <h2 class="mb-4 text-xl font-bold">Comisiones activas</h2>
            
            <div class="grid gap-3 md:grid-cols-2">
                {#each subject.commissions as commission}
                    <a 
                        href="/comisiones/{commission.id}"
                        class="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-800/30 p-4 transition hover:border-slate-600"
                    >
                        <div>
                            <p class="font-medium">{commission.name}</p>
                            <p class="text-sm text-slate-400">
                                {commission.term.name} {commission.term.year}
                                • {commission._count.enrollments} inscriptos
                            </p>
                        </div>
                        <span class="text-slate-500">→</span>
                    </a>
                {/each}
            </div>
        </section>
    {/if}
</div>
