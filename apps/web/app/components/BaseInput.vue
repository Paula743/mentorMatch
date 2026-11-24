<script setup lang="ts">
defineOptions({ inheritAttrs: false })
defineProps<{ label?: string }>()
const model = defineModel<string>()
</script>

<template>
  <label class="block">
    <span v-if="label" class="mb-1 block text-sm font-medium text-slate-700">{{ label }}</span>
    <input
      v-model="model"
      v-bind="$attrs"
      class="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
    />
  </label>
</template>