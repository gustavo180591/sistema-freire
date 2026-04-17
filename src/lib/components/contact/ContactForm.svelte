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
	const success = $derived(form?.success ?? true);

	// Estado para efectos de focus
	let focusedFields = $state<Record<string, boolean>>({
		name: false,
		email: false,
		phone: false,
		message: false
	});

	function setFocus(field: string, value: boolean) {
		focusedFields[field] = value;
	}
</script>

<div class="relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/60 backdrop-blur-xl p-8 shadow-2xl shadow-blue-500/10 animate-fade-in hover:shadow-blue-500/20 transition-shadow duration-500">
	<!-- Decorative background elements -->
	<div class="absolute -top-20 -right-20 h-40 w-40 rounded-full bg-gradient-to-br from-blue-500/10 to-purple-500/10 blur-3xl animate-pulse"></div>
	<div class="absolute -bottom-20 -left-20 h-40 w-40 rounded-full bg-gradient-to-br from-purple-500/10 to-blue-500/10 blur-3xl animate-pulse" style:animation-delay="1s"></div>
	<div class="absolute top-0 right-0 h-32 w-32 rounded-full bg-blue-500/10 blur-2xl animate-pulse" style:animation-delay="0.5s"></div>

	<div class="relative z-10">
		<h2 class="text-3xl font-bold text-white">
			Envíanos un Mensaje
		</h2>
		<p class="mt-2 text-slate-400">
			Completa el formulario y te responderemos lo antes posible.
		</p>

		<form method="POST" use:enhance class="mt-8 space-y-6">
			{#if !success && errors.general}
				<div
					class="rounded-2xl border border-red-500/50 bg-red-500/10 p-4 text-sm text-red-400 animate-slide-in"
				>
					{errors.general}
				</div>
			{/if}

			{#if success && form?.message}
				<div
					class="rounded-2xl border border-green-500/50 bg-green-500/10 p-4 text-sm text-green-400 animate-slide-in"
				>
					{form.message}
				</div>
			{/if}

			<div class="grid gap-6 sm:grid-cols-2">
				<div class="group">
					<label
						for="name"
						class="mb-2 block text-sm font-medium text-slate-300 transition-colors group-focus-within:text-blue-400"
					>
						Nombre <span class="text-red-400">*</span>
					</label>
					<div class="relative">
						<input
							id="name"
							name="name"
							type="text"
							required
							placeholder="Tu nombre"
							onfocus={() => setFocus('name', true)}
							onblur={() => setFocus('name', false)}
							class="peer w-full rounded-xl border border-slate-600 bg-slate-900/50 px-4 py-3.5 text-slate-300 placeholder-slate-500 transition-all duration-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-slate-900/80 dark:border-slate-600 {focusedFields.name
								? 'border-blue-500 shadow-lg shadow-blue-500/20'
								: 'border-slate-600 hover:border-slate-500'}"
						/>
						<div
							class="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/0 to-purple-500/0 transition-all duration-300 peer-focus:from-blue-500/10 peer-focus:to-purple-500/10"
						></div>
					</div>
					{#if errors.name}
						<p class="mt-1.5 text-sm text-red-400 animate-slide-in">{errors.name}</p>
					{/if}
				</div>

				<div class="group">
					<label
						for="email"
						class="mb-2 block text-sm font-medium text-slate-300 transition-colors group-focus-within:text-blue-400"
					>
						Email <span class="text-red-400">*</span>
					</label>
					<div class="relative">
						<input
							id="email"
							name="email"
							type="email"
							required
							placeholder="tu@email.com"
							onfocus={() => setFocus('email', true)}
							onblur={() => setFocus('email', false)}
							class="peer w-full rounded-xl border border-slate-600 bg-slate-900/50 px-4 py-3.5 text-slate-300 placeholder-slate-500 transition-all duration-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-slate-900/80 dark:border-slate-600 {focusedFields.email
								? 'border-blue-500 shadow-lg shadow-blue-500/20'
								: 'border-slate-600 hover:border-slate-500'}"
						/>
						<div
							class="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/0 to-purple-500/0 transition-all duration-300 peer-focus:from-blue-500/10 peer-focus:to-purple-500/10"
						></div>
					</div>
					{#if errors.email}
						<p class="mt-1.5 text-sm text-red-400 animate-slide-in">{errors.email}</p>
					{/if}
				</div>
			</div>

			<div class="group">
				<label
					for="phone"
					class="mb-2 block text-sm font-medium text-slate-300 transition-colors group-focus-within:text-blue-400"
				>
					Teléfono
				</label>
				<div class="relative">
					<input
						id="phone"
						name="phone"
						type="tel"
						placeholder="+1 234 567 890"
						onfocus={() => setFocus('phone', true)}
						onblur={() => setFocus('phone', false)}
						class="peer w-full rounded-xl border border-slate-600 bg-slate-900/50 px-4 py-3.5 text-slate-300 placeholder-slate-500 transition-all duration-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-slate-900/80 dark:border-slate-600 {focusedFields.phone
							? 'border-blue-500 shadow-lg shadow-blue-500/20'
							: 'border-slate-600 hover:border-slate-500'}"
					/>
					<div
						class="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/0 to-purple-500/0 transition-all duration-300 peer-focus:from-blue-500/10 peer-focus:to-purple-500/10"
					></div>
				</div>
				{#if errors.phone}
					<p class="mt-1.5 text-sm text-red-400 animate-slide-in">{errors.phone}</p>
				{/if}
			</div>

			<div class="group">
				<label
					for="message"
					class="mb-2 block text-sm font-medium text-slate-300 transition-colors group-focus-within:text-blue-400"
				>
					Mensaje <span class="text-red-400">*</span>
				</label>
				<div class="relative">
					<textarea
							id="message"
							name="message"
							rows="5"
							required
							placeholder="Escribe tu mensaje aquí..."
							onfocus={() => setFocus('message', true)}
							onblur={() => setFocus('message', false)}
							class="peer w-full rounded-xl border border-slate-600 bg-slate-900/50 px-4 py-3.5 text-slate-300 placeholder-slate-500 transition-all duration-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-slate-900/80 dark:border-slate-600 resize-none {focusedFields.message
								? 'border-blue-500 shadow-lg shadow-blue-500/20'
								: 'border-slate-600 hover:border-slate-500'}"
						></textarea>
					<div
						class="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/0 to-purple-500/0 transition-all duration-300 peer-focus:from-blue-500/10 peer-focus:to-purple-500/10"
					></div>
				</div>
				{#if errors.message}
					<p class="mt-1.5 text-sm text-red-400 animate-slide-in">{errors.message}</p>
				{/if}
			</div>

			<button
				type="submit"
				class="w-full rounded-2xl bg-white px-6 py-3 font-semibold text-slate-950 transition hover:scale-[1.02]"
			>
				<span class="flex items-center justify-center space-x-2">
					<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
						></path>
					</svg>
					<span>Enviar Mensaje</span>
				</span>
			</button>
		</form>
	</div>
</div>

<style>
	@keyframes fade-in {
		from {
			opacity: 0;
			transform: translateY(10px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@keyframes slide-in {
		from {
			opacity: 0;
			transform: translateX(10px);
		}
		to {
			opacity: 1;
			transform: translateX(0);
		}
	}

	.animate-fade-in {
		animation: fade-in 0.6s ease-out forwards;
	}

	.animate-slide-in {
		animation: slide-in 0.4s ease-out forwards;
		opacity: 0;
	}
</style>
