<script setup lang="ts">
defineProps<{ title: string }>();
const emit = defineEmits<{ close: [] }>();
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" @click.self="emit('close')">
    <div class="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
      <h2 class="mb-4 text-lg font-semibold">{{ title }}</h2>
      <slot />
    </div>
  </div>
</template>