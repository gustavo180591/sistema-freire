<script lang="ts">
	import ContactInfo from '$lib/components/contact/ContactInfo.svelte';
	import ContactForm from '$lib/components/contact/ContactForm.svelte';

	let { form } = $props();
</script>

<svelte:head>
	<title>Contacto | Paulo Freire</title>
	<meta name="description" content="Ponte en contacto con nosotros" />
</svelte:head>

<div class="min-h-screen bg-slate-950 p-6">
	<div class="mx-auto max-w-7xl space-y-8">
		<!-- Header -->
		<div>
			<p class="text-sm tracking-[0.2em] text-slate-400 uppercase">Contacto</p>
			<h1 class="mt-2 text-3xl font-bold tracking-tight text-white">Contáctanos</h1>
			<p class="mt-2 text-sm text-white">
				Estamos aquí para ayudarte. Envíanos un mensaje y te responderemos lo antes posible.
			</p>
		</div>

		<!-- Contact Section -->
		<div class="grid gap-8 lg:grid-cols-2">
			<!-- Contact Information -->
			<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
				<ContactInfo />
			</div>

			<!-- Contact Form -->
			<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
				<ContactForm {form} />
			</div>
		</div>
	</div>
</div>
