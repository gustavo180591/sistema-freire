<script lang="ts">
	import ContactInfo from '$lib/components/contact/ContactInfo.svelte';
	import ContactForm from '$lib/components/contact/ContactForm.svelte';

	let { form } = $props();
</script>

<svelte:head>
	<title>Contacto | Paulo Freire</title>
	<meta name="description" content="Ponte en contacto con nosotros" />
</svelte:head>

<div class="min-h-screen bg-slate-950 text-white">
	<!-- Background decorative elements -->
	<div class="fixed inset-0 overflow-hidden pointer-events-none">
		<div class="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-gradient-to-br from-blue-500/10 to-purple-500/10 blur-3xl animate-pulse"></div>
		<div class="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-gradient-to-br from-purple-500/10 to-blue-500/10 blur-3xl animate-pulse" style:animation-delay="1s"></div>
		<div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[800px] w-[800px] rounded-full bg-gradient-to-r from-blue-500/5 to-purple-500/5 blur-3xl animate-pulse" style:animation-delay="2s"></div>
		<div class="absolute top-20 left-20 h-32 w-32 rounded-full bg-blue-400/10 blur-2xl animate-pulse" style:animation-delay="0.5s"></div>
		<div class="absolute bottom-20 right-20 h-32 w-32 rounded-full bg-purple-400/10 blur-2xl animate-pulse" style:animation-delay="1.5s"></div>
	</div>

	<!-- Hero Section -->
	<section class="relative overflow-hidden py-24 sm:py-40">
		<div class="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
			<div class="text-center animate-fade-in">
				<h1 class="text-5xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-blue-400 bg-clip-text text-transparent sm:text-6xl md:text-7xl animate-gradient-x leading-tight">
					Contáctanos
				</h1>
				<p class="mt-8 text-xl text-slate-400 max-w-3xl mx-auto leading-relaxed">
					Estamos aquí para ayudarte. Envíanos un mensaje y te responderemos lo antes posible.
					<br class="hidden sm:block" />
					Tu feedback es importante para nosotros.
				</p>
			</div>
		</div>
	</section>

	<!-- Contact Section -->
	<section class="relative mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
		<div class="grid gap-20 lg:grid-cols-2 lg:gap-32">
			<!-- Contact Information -->
			<div class="animate-slide-in" style:animation-delay="200ms">
				<ContactInfo />
			</div>

			<!-- Contact Form -->
			<div class="animate-slide-in" style:animation-delay="400ms">
				<ContactForm {form} />
			</div>
		</div>
	</section>
</div>

<style>
	@keyframes fade-in {
		from {
			opacity: 0;
			transform: translateY(20px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@keyframes slide-in {
		from {
			opacity: 0;
			transform: translateY(30px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@keyframes gradient-x {
		0%, 100% {
			background-position: 0% 50%;
		}
		50% {
			background-position: 100% 50%;
		}
	}

	.animate-fade-in {
		animation: fade-in 0.8s ease-out forwards;
	}

	.animate-slide-in {
		animation: slide-in 0.8s ease-out forwards;
		opacity: 0;
	}

	.animate-gradient-x {
		background-size: 200% auto;
		animation: gradient-x 3s linear infinite;
	}
</style>
