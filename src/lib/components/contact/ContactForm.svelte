<script lang="ts">
	import { enhance } from '$app/forms';

	let { form } = $props();

	const errors = $derived(
		(form?.errors as {
			name?: string;
			email?: string;
			phone?: string;
			message?: string;
			general?: string;
		}) ?? {}
	);
</script>

<div>
	<div class="mb-6">
		<h2 class="text-3xl font-bold text-white">Envíanos un Mensaje</h2>
		<p class="mt-2 text-sm text-slate-400">
			Completa el formulario y te responderemos lo antes posible.
		</p>
	</div>

	<form method="POST" use:enhance class="space-y-6">
		{#if errors.general}
			<div class="rounded-2xl border border-red-500/50 bg-red-500/10 p-4 text-sm text-red-400">
				{errors.general}
			</div>
		{/if}

		<div class="grid gap-6 sm:grid-cols-2">
			<div>
				<label for="name" class="mb-2 block text-sm font-medium text-slate-300">
					Nombre <span class="text-red-400">*</span>
				</label>
				<input
					id="name"
					name="name"
					type="text"
					required
					placeholder="Tu nombre"
					class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-300 placeholder-slate-500 transition outline-none focus:border-slate-500"
				/>
				{#if errors.name}
					<p class="mt-1.5 text-sm text-red-400">{errors.name}</p>
				{/if}
			</div>

			<div>
				<label for="email" class="mb-2 block text-sm font-medium text-slate-300">
					Email <span class="text-red-400">*</span>
				</label>
				<input
					id="email"
					name="email"
					type="email"
					required
					placeholder="tu@email.com"
					class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-300 placeholder-slate-500 transition outline-none focus:border-slate-500"
				/>
				{#if errors.email}
					<p class="mt-1.5 text-sm text-red-400">{errors.email}</p>
				{/if}
			</div>
		</div>

		<div>
			<label for="phone" class="mb-2 block text-sm font-medium text-slate-300">
				Teléfono
			</label>
			<input
				id="phone"
				name="phone"
				type="tel"
				placeholder="+1 234 567 890"
				class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-300 placeholder-slate-500 transition outline-none focus:border-slate-500"
			/>
			{#if errors.phone}
				<p class="mt-1.5 text-sm text-red-400">{errors.phone}</p>
			{/if}
		</div>

		<div>
			<label for="message" class="mb-2 block text-sm font-medium text-slate-300">
				Mensaje <span class="text-red-400">*</span>
			</label>
			<textarea
				id="message"
				name="message"
				rows="5"
				required
				placeholder="Escribe tu mensaje aquí..."
				class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-300 placeholder-slate-500 transition outline-none focus:border-slate-500 resize-none"
			></textarea>
			{#if errors.message}
				<p class="mt-1.5 text-sm text-red-400">{errors.message}</p>
			{/if}
		</div>

		<button
			type="submit"
			class="w-full rounded-2xl bg-slate-950 border border-slate-700 px-6 py-3 font-semibold text-white transition hover:border-slate-500"
		>
			Enviar Mensaje
		</button>
	</form>
</div>
