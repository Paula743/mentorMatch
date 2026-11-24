<script setup lang="ts">
const props = defineProps<{ completed: number; total: number }>();

const finished = computed(() => props.total > 0 && props.completed >= props.total);
const percent = computed(() =>
  props.total > 0 ? Math.min(100, Math.round((props.completed / props.total) * 100)) : 0
);
</script>

<template>
  <div>
    <div class="mb-1 flex items-center justify-between text-sm">
      <span class="text-gray-600">Avance en la carrera</span>
      <span
        v-if="finished"
        class="rounded bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800"
      >Finalizada</span>
      <span v-else class="font-semibold text-slate-900">{{ percent }}%</span>
    </div>
    <div
      class="h-2.5 overflow-hidden rounded-full bg-gray-200"
      role="progressbar" :aria-valuenow="finished ? 100 : percent" aria-valuemin="0" aria-valuemax="100"
    >
      <div
        class="h-full rounded-full transition-all"
        :class="finished ? 'bg-green-500' : 'bg-brand-600'"
        :style="{ width: `${finished ? 100 : percent}%` }"
      />
    </div>
    <p v-if="!finished" class="mt-1 text-xs text-gray-500">{{ completed }} de {{ total }} semestres cursados</p>
  </div>
</template>
