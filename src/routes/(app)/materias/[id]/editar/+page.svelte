<script lang="ts">
    import { enhance } from '$app/forms';
    
    let { data, form } = $props();
    
    const subject = $derived(data.subject);
    const careers = $derived(data.careers);
    const allSubjects = $derived(data.allSubjects);
    
    // Opciones para selects
    const subjectTypes = [
        { value: 'COMMON', label: 'Común' },
        { value: 'CAREER_SPECIFIC', label: 'Específica de Carrera' },
        { value: 'EDI', label: 'EDI' }
    ];
    
    const trainingFields = [
        { value: 'GENERAL', label: 'Formación General' },
        { value: 'ESPECIFICA', label: 'Formación Específica' },
        { value: 'PRACTICA', label: 'Práctica' },
        { value: 'EDI', label: 'EDI' }
    ];
    
    const accreditationModes = [
        { value: 'PROMOCIONAL', label: 'Promocional' },
        { value: 'EXAMEN_FINAL', label: 'Examen Final' },
        { value: 'PROMOCIONAL_SIN_FINAL', label: 'Promocional sin examen final' }
    ];
    
    let activeTab = $state('general');
</script>

<svelte:head>
    <title>Editar Materia | {subject.name}</title>
</svelte:head>

<div class="space-y-6">
    <!-- Header -->
    <section class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
        <div class="mb-4">
            <a href="/materias/{subject.id}" class="text-sm text-slate-400 hover:text-slate-300">
                ← Volver a detalle
            </a>
        </div>
        <div class="flex items-center justify-between">
            <div>
                <p class="text-sm tracking-[0.2em] text-slate-400 uppercase">Editar Materia</p>
                <h1 class="mt-2 text-3xl font-bold">{subject.name}</h1>
                <p class="mt-1 font-mono text-sm text-slate-400">{subject.code}</p>
            </div>
            <div class="flex gap-2">
                <a 
                    href="/materias/{subject.id}/correlativas"
                    class="rounded-xl border border-slate-700 px-4 py-2 text-sm hover:border-slate-500"
                >
                    Ver Correlativas
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
    
    <!-- Tabs -->
    <div class="flex gap-2 border-b border-slate-800">
        <button 
            class="px-4 py-3 text-sm font-medium transition {activeTab === 'general' ? 'border-b-2 border-white text-white' : 'text-slate-400 hover:text-slate-300'}"
            onclick={() => activeTab = 'general'}
        >
            Información General
        </button>
        <button 
            class="px-4 py-3 text-sm font-medium transition {activeTab === 'careers' ? 'border-b-2 border-white text-white' : 'text-slate-400 hover:text-slate-300'}"
            onclick={() => activeTab = 'careers'}
        >
            Carreras ({subject.careerSubjects.length})
        </button>
    </div>
    
    <!-- Tab: Información General -->
    {#if activeTab === 'general'}
        <section class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
            <form method="POST" action="?/update" use:enhance>
                <div class="grid gap-6 md:grid-cols-2">
                    <!-- Código -->
                    <div class="space-y-2">
                        <label for="code" class="text-sm font-medium text-slate-300">Código</label>
                        <input 
                            id="code"
                            type="text" 
                            name="code" 
                            value={subject.code}
                            class="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
                            required
                        />
                    </div>
                    
                    <!-- Nombre -->
                    <div class="space-y-2">
                        <label for="name" class="text-sm font-medium text-slate-300">Nombre</label>
                        <input 
                            id="name"
                            type="text" 
                            name="name" 
                            value={subject.name}
                            class="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
                            required
                        />
                    </div>
                    
                    <!-- Tipo de Materia -->
                    <div class="space-y-2">
                        <label for="subjectType" class="text-sm font-medium text-slate-300">Tipo de Materia</label>
                        <select 
                            id="subjectType"
                            name="subjectType" 
                            class="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
                            required
                        >
                            {#each subjectTypes as type}
                                <option value={type.value} selected={subject.subjectType === type.value}>
                                    {type.label}
                                </option>
                            {/each}
                        </select>
                    </div>
                    
                    <!-- Campo de Formación -->
                    <div class="space-y-2">
                        <label for="trainingField" class="text-sm font-medium text-slate-300">Campo de Formación</label>
                        <select 
                            id="trainingField"
                            name="trainingField" 
                            class="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
                            required
                        >
                            {#each trainingFields as field}
                                <option value={field.value} selected={subject.trainingField === field.value}>
                                    {field.label}
                                </option>
                            {/each}
                        </select>
                    </div>
                    
                    <!-- Año -->
                    <div class="space-y-2">
                        <label for="yearLevel" class="text-sm font-medium text-slate-300">Año</label>
                        <select 
                            id="yearLevel"
                            name="yearLevel" 
                            class="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
                            required
                        >
                            {#each [1, 2, 3, 4] as year}
                                <option value={year} selected={subject.yearLevel === year}>
                                    {year}° Año
                                </option>
                            {/each}
                        </select>
                    </div>
                    
                    <!-- Modalidad -->
                    <div class="space-y-2">
                        <label for="accreditationMode" class="text-sm font-medium text-slate-300">Modalidad de Acreditación</label>
                        <select 
                            id="accreditationMode"
                            name="accreditationMode" 
                            class="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
                            required
                        >
                            {#each accreditationModes as mode}
                                <option value={mode.value} selected={subject.accreditationMode === mode.value}>
                                    {mode.label}
                                </option>
                            {/each}
                        </select>
                    </div>
                    
                    <!-- Horas -->
                    <div class="space-y-2">
                        <label for="hoursPerWeek" class="text-sm font-medium text-slate-300">Horas Semanales</label>
                        <input 
                            id="hoursPerWeek"
                            type="number" 
                            name="hoursPerWeek" 
                            value={subject.hoursPerWeek || ''}
                            class="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
                        />
                    </div>
                    
                    <!-- Descripción -->
                    <div class="space-y-2 md:col-span-2">
                        <label for="description" class="text-sm font-medium text-slate-300">Descripción</label>
                        <textarea 
                            id="description"
                            name="description" 
                            rows="3"
                            class="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
                        >{subject.description || ''}</textarea>
                    </div>
                </div>
                
                <div class="mt-6 flex justify-end gap-3">
                    <a 
                        href="/materias/{subject.id}"
                        class="rounded-xl border border-slate-700 px-6 py-3 text-sm font-medium hover:border-slate-500"
                    >
                        Cancelar
                    </a>
                    <button 
                        type="submit"
                        class="rounded-xl bg-white px-6 py-3 text-sm font-medium text-slate-950 hover:scale-[1.02] transition"
                    >
                        Guardar Cambios
                    </button>
                </div>
            </form>
        </section>
    {/if}
    
    <!-- Tab: Carreras -->
    {#if activeTab === 'careers'}
        <section class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
            <h2 class="mb-4 text-xl font-bold">Carreras Asociadas</h2>
            
            <!-- Lista de carreras actuales -->
            {#if subject.careerSubjects.length > 0}
                <div class="mb-6 space-y-3">
                    {#each subject.careerSubjects as cs}
                        <div class="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-800/50 p-4">
                            <div>
                                <p class="font-medium">{cs.career.name}</p>
                                <p class="text-sm text-slate-400">{cs.career.code} • Año {cs.yearLevel}</p>
                            </div>
                            <form method="POST" action="?/removeCareer" use:enhance class="flex items-center gap-2">
                                <input type="hidden" name="careerId" value={cs.career.id} />
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
                <p class="mb-6 text-slate-400">Esta materia no está asociada a ninguna carrera.</p>
            {/if}
            
            <!-- Agregar nueva carrera -->
            <div class="rounded-xl border border-slate-800 bg-slate-800/30 p-4">
                <h3 class="mb-4 font-medium">Agregar a Carrera</h3>
                <form method="POST" action="?/addCareer" use:enhance class="flex gap-3">
                    <select 
                        name="careerId" 
                        class="flex-1 rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
                        required
                    >
                        <option value="">Seleccionar carrera...</option>
                        {#each careers.filter((c: {id: string}) => !subject.careerSubjects.some((cs: {career: {id: string}}) => cs.career.id === c.id)) as career}
                            <option value={career.id}>{career.name}</option>
                        {/each}
                    </select>
                    <select 
                        name="yearLevel" 
                        class="w-32 rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
                        required
                    >
                        <option value="1">1° Año</option>
                        <option value="2">2° Año</option>
                        <option value="3">3° Año</option>
                        <option value="4">4° Año</option>
                    </select>
                    <button 
                        type="submit"
                        class="rounded-xl bg-blue-500 px-6 py-3 text-sm font-medium text-white hover:bg-blue-600 transition"
                    >
                        Agregar
                    </button>
                </form>
            </div>
        </section>
    {/if}
</div>
