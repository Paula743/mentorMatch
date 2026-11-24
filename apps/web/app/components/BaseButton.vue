<script setup lang="ts">
defineProps<{ loading?: boolean }>()
</script>

<template>
  <button
    class="w-full rounded-lg bg-brand-600 px-4 py-3 font-semibold text-white transition hover:bg-brand-700 focus:outline-none focus:ring-4 focus:ring-brand-100 disabled:opacity-60"
    :disabled="loading"
  >
    <slot />
  </button>
</template>