<script setup lang="ts">
defineProps<{
  links: { to: string; label: string }[];
  // Opción "Editar perfil" entre el nombre y "Cerrar sesión" (solo la usa el panel del tutor)
  profile?: { to: string; label: string; enabled: boolean; hint?: string };
}>();
const auth = useAuthStore();

const initials = computed(() =>
  (auth.user?.full_name ?? "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("")
);
</script>

<template>
  <aside
    class="sticky top-0 flex h-screen w-64 shrink-0 flex-col overflow-hidden bg-linear-to-b from-brand-700 via-brand-600 to-brand-500 p-5 text-white"
  >
    <!-- Decoración de fondo -->
    <div class="pointer-events-none absolute -right-20 -top-20 size-64 rounded-full bg-white/10 blur-3xl" />
    <div class="pointer-events-none absolute -bottom-24 -left-20 size-64 rounded-full bg-brand-100/20 blur-3xl" />

    <!-- Logo -->
    <div class="relative mb-8 flex items-center gap-3">
      <div class="grid size-10 place-items-center rounded-xl bg-white text-brand-700 shadow-lg">
        <svg viewBox="0 0 24 24" class="size-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M22 10 12 5 2 10l10 5 10-5Z" />
          <path d="M6 12v5c3 2 9 2 12 0v-5" />
        </svg>
      </div>
      <div class="leading-tight">
        <p class="text-lg font-bold">MentorMatch</p>
        <p class="text-[11px] font-medium uppercase tracking-wider text-brand-100">Asesorías académicas</p>
      </div>
    </div>

    <!-- Navegación -->
    <nav class="relative flex-1 space-y-1 overflow-y-auto">
      <NuxtLink
        v-for="l in links" :key="l.to" :to="l.to"
        class="block rounded-xl px-4 py-2.5 text-sm font-medium text-brand-100 transition hover:bg-white/10 hover:text-white"
        exact-active-class="!bg-white/15 !text-white font-semibold ring-1 ring-white/20"
      >{{ l.label }}</NuxtLink>
    </nav>

    <!-- Usuario y salida -->
    <div class="relative mt-4 space-y-3 border-t border-white/15 pt-4">
      <div class="flex items-center gap-3 rounded-xl bg-white/10 p-3 ring-1 ring-white/15">
        <span class="grid size-9 shrink-0 place-items-center rounded-full bg-white text-sm font-bold text-brand-700">
          {{ initials || "?" }}
        </span>
        <p class="truncate text-sm font-semibold">{{ auth.user?.full_name }}</p>
      </div>

      <!-- Editar perfil: va DESPUÉS del recuadro con el nombre y ANTES de "Cerrar sesión" -->
      <template v-if="profile">
        <NuxtLink
          v-if="profile.enabled" :to="profile.to"
          class="block w-full rounded-xl bg-white/10 px-4 py-2.5 text-left text-sm font-medium transition hover:bg-white/20 focus:outline-none focus:ring-4 focus:ring-white/20"
          exact-active-class="!bg-white/20 ring-1 ring-white/30"
        >{{ profile.label }}</NuxtLink>
        <div v-else :title="profile.hint">
          <span
            class="block w-full cursor-not-allowed rounded-xl bg-white/5 px-4 py-2.5 text-left text-sm font-medium text-white/50"
            aria-disabled="true"
          >{{ profile.label }}</span>
          <p v-if="profile.hint" class="mt-1 px-1 text-[11px] leading-snug text-brand-100">{{ profile.hint }}</p>
        </div>
      </template>

      <button
        class="w-full rounded-xl bg-white/10 px-4 py-2.5 text-left text-sm font-medium transition hover:bg-white/20 focus:outline-none focus:ring-4 focus:ring-white/20"
        @click="auth.logout()"
      >
        Cerrar sesión
      </button>
    </div>
  </aside>
</template>