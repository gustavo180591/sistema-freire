<script lang="ts">
	interface ContactItem {
		icon: string;
		title: string;
		content: string;
		delay: number;
	}

	const contactItems: ContactItem[] = [
		{
			icon: 'map-pin',
			title: 'Dirección',
			content: 'Calle Principal 123, Ciudad, País',
			delay: 0
		},
		{
			icon: 'phone',
			title: 'Teléfono',
			content: '+1 234 567 890',
			delay: 100
		},
		{
			icon: 'mail',
			title: 'Email',
			content: 'contacto@freire.com',
			delay: 200
		},
		{
			icon: 'clock',
			title: 'Horario',
			content: 'Lun - Vie: 9:00 - 18:00',
			delay: 300
		}
	];
</script>

<div class="space-y-6">
	<div
		class="animate-fade-in"
		style:animation-delay="0ms"
	>
		<h2 class="text-3xl font-bold text-white">
			Información de Contacto
		</h2>
		<p class="mt-3 text-slate-400">
			Puedes contactarnos a través de cualquiera de estos medios. Estamos aquí para ayudarte.
		</p>
	</div>

	<div class="space-y-4">
		{#each contactItems as item}
			<div
				class="group relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/60 p-8 transition-all duration-300 hover:border-blue-500/50 hover:bg-slate-900/80 hover:shadow-xl hover:shadow-blue-500/10 animate-slide-in"
				style:animation-delay="{item.delay}ms"
			>
				<div class="relative z-10 flex items-start space-x-4">
					<div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-blue-500 to-purple-600 shadow-lg shadow-blue-500/25 transition-all duration-300 group-hover:scale-110 group-hover:shadow-blue-500/40">
						{#if item.icon === 'map-pin'}
							<svg
								class="h-6 w-6 text-white"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
								></path>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
								></path>
							</svg>
						{:else if item.icon === 'phone'}
							<svg
								class="h-6 w-6 text-white"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
								></path>
							</svg>
						{:else if item.icon === 'mail'}
							<svg
								class="h-6 w-6 text-white"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
								></path>
							</svg>
						{:else if item.icon === 'clock'}
							<svg
								class="h-6 w-6 text-white"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
								></path>
							</svg>
						{/if}
					</div>
					<div class="flex-1">
						<h3 class="font-semibold text-white transition-colors group-hover:text-blue-400">
							{item.title}
						</h3>
						<p class="mt-1 text-slate-400 transition-colors group-hover:text-slate-300">
							{item.content}
						</p>
					</div>
				</div>
				<div class="absolute -right-16 -top-16 h-32 w-32 rounded-full bg-linear-to-br from-blue-500/20 to-purple-500/20 blur-2xl transition-all duration-500 group-hover:scale-150"></div>
			</div>
		{/each}
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
			transform: translateX(-20px);
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
		animation: slide-in 0.6s ease-out forwards;
		opacity: 0;
	}
</style>
