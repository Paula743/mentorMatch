<script setup lang="ts">
import type { SessionState } from "~/utils/sessions";
defineProps<{ state: SessionState }>();

const config: Record<SessionState, { label: string; cls: string }> = {
  UPCOMING: { label: "Confirmada", cls: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  COMPLETED: { label: "Completada", cls: "bg-slate-100 text-slate-600 ring-slate-200" },
  CANCELLED: { label: "Cancelada", cls: "bg-red-50 text-red-700 ring-red-200" },
};
</script>

<template>
  <span
    class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1"
    :class="config[state].cls"
  >
    {{ config[state].label }}
  </span>
</template>