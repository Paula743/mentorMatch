<script setup lang="ts">
// Estrellas de solo lectura
const props = defineProps<{ value: number | null; count?: number }>();
const filled = computed(() => Math.max(0, Math.min(5, props.value ?? 0)));
</script>

<template>
  <span class="inline-flex items-center gap-1.5" :aria-label="value != null ? `${value} de 5 estrellas` : 'Sin calificaciones'">
    <span class="relative inline-block text-base leading-none tracking-wider text-gray-300" aria-hidden="true">
      ★★★★★
      <span class="absolute inset-y-0 left-0 overflow-hidden whitespace-nowrap text-amber-500" :style="{ width: `${(filled / 5) * 100}%` }">★★★★★</span>
    </span>
    <span v-if="value != null" class="text-sm font-semibold text-slate-900">{{ value.toFixed(1) }}</span>
    <span v-if="count !== undefined" class="text-xs text-gray-500">
      {{ count ? `(${count} ${count === 1 ? "calificación" : "calificaciones"})` : "Sin calificaciones" }}
    </span>
  </span>
</template>
