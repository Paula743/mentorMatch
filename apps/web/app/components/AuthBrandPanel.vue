<script setup lang="ts">
const steps = [
  {
    title: 'Busca tu tutor',
    text: 'Consulta información de tu tutor.',
  },
  {
    title: 'Escoge un horario',
    text: 'Consulta la disponibilidad y reserva en un par de clics.',
  },
  {
    title: 'Asiste a tu asesoría',
    text: 'Consulta o cancela tus reservas desde un solo lugar.',
  },
]
</script>

<template>
  <aside
    class="relative hidden flex-col justify-between overflow-hidden bg-linear-to-br from-brand-700 via-brand-600 to-brand-500 p-12 text-white lg:flex"
  >
    
    <div class="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full bg-white/10 blur-3xl" />
    <div class="pointer-events-none absolute -bottom-32 -left-24 size-96 rounded-full bg-brand-100/20 blur-3xl" />

    <div class="relative flex items-center gap-3">
      <div class="grid size-11 place-items-center rounded-xl bg-white text-brand-700 shadow-lg">
        <svg viewBox="0 0 24 24" class="size-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M22 10 12 5 2 10l10 5 10-5Z" />
          <path d="M6 12v5c3 2 9 2 12 0v-5" />
        </svg>
      </div>
      <div class="leading-tight">
        <p class="text-lg font-bold">MentorMatch</p>
        <p class="text-xs font-medium uppercase tracking-wider text-brand-100">Asesorías académicas</p>
      </div>
    </div>

    
    <div class="relative max-w-md">
      <h2 class="text-4xl font-bold leading-tight xl:text-5xl">
        Reserva tu asesoría en minutos.
      </h2>
      <p class="mt-4 text-lg text-brand-100">
        Nuestra visión es conectar tutores y estudiantes para organizar sesiones sin complicaciones.
      </p>

      <ol class="mt-10 space-y-4">
        <li
          v-for="(step, i) in steps"
          :key="step.title"
          class="flex gap-4 rounded-2xl bg-white/10 p-4 ring-1 ring-white/15 backdrop-blur-sm"
        >
          <span class="grid size-9 shrink-0 place-items-center rounded-full bg-white font-bold text-brand-700">
            {{ i + 1 }}
          </span>
          <div>
            <p class="font-semibold">{{ step.title }}</p>
            <p class="text-sm text-brand-100">{{ step.text }}</p>
          </div>
        </li>
      </ol>

    </div>
    <p class="relative text-sm text-brand-100">© 2026 MentorMatch</p>
  </aside>
</template>