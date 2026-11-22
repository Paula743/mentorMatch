<script setup lang="ts">
defineProps<{ links: { to: string; label: string }[] }>();
const auth = useAuthStore();
</script>

<template>
  <aside class="flex w-56 shrink-0 flex-col bg-slate-900 p-4 text-white">
    <h1 class="mb-6 text-xl font-bold">MentorMatch</h1>
    <nav class="flex-1 space-y-1">
      <NuxtLink
        v-for="l in links" :key="l.to" :to="l.to"
        class="block rounded px-3 py-2 hover:bg-slate-700"
        exact-active-class="bg-slate-700 font-semibold"
      >{{ l.label }}</NuxtLink>
    </nav>
    <p class="mb-2 truncate text-sm text-slate-300">{{ auth.user?.full_name }}</p>
    <button class="rounded bg-slate-700 px-3 py-2 text-left hover:bg-slate-600" @click="auth.logout()">
      Cerrar sesión
    </button>
  </aside>
</template>