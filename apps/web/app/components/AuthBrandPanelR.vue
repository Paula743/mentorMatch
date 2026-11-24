<script setup lang="ts">
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
        Reserva las sesiones necesarias con tu tutor.
      </h2>
      <p class="mt-4 text-lg text-brand-100">
        Conectamos de manera eficiente estudiantes con tutores de manera optima.
      </p>

      
    </div>

    <p class="relative text-sm text-brand-100">© 2026 MentorMatch</p>
  </aside>
</template>