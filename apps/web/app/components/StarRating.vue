<script setup lang="ts">
const model = defineModel<number | null>({ default: null });
defineProps<{ readonly?: boolean; small?: boolean }>();
</script>

<template>
  <div class="inline-flex gap-1" role="group" aria-label="Calificación">
    <component
      :is="readonly ? 'span' : 'button'"
      v-for="n in 5"
      :key="n"
      :type="readonly ? undefined : 'button'"
      :aria-label="`${n} de 5`"
      class="leading-none transition"
      :class="[
        small ? 'text-base' : 'text-3xl',
        (model ?? 0) >= n ? 'text-amber-400' : 'text-slate-300',
        readonly ? '' : 'hover:scale-110',
      ]"
      @click="!readonly && (model = n)"
    >★</component>
  </div>
</template>