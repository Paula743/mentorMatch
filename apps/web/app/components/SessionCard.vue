<script setup lang="ts">
import type { Session } from "~/types/student";

const props = defineProps<{ session: Session }>();
defineEmits<{ details: [s: Session]; cancel: [s: Session]; rate: [s: Session] }>();

const state = computed(() => sessionState(props.session));
const parts = computed(() => dateParts(props.session.starts_at));
const cancellable = computed(() => canCancel(props.session));
const rateable = computed(() => canRate(props.session));

const boxCls = computed(() => ({
  UPCOMING: "bg-brand-50 text-brand-700",
  COMPLETED: "bg-slate-100 text-slate-600",
  CANCELLED: "bg-red-50 text-red-600",
}[state.value]));
</script>

<template>
  <article class="flex flex-col gap-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:flex-row sm:items-center">
    <div class="grid w-16 shrink-0 place-items-center rounded-xl py-2 text-center" :class="boxCls">
      <span class="text-[11px] font-bold">{{ parts.weekday }}</span>
      <span class="text-2xl font-bold leading-none">{{ parts.day }}</span>
      <span class="text-[11px] font-semibold">{{ parts.time }}</span>
    </div>

    <div class="min-w-0 flex-1">
      <div class="flex flex-wrap items-center gap-2">
        <h3 class="font-semibold">{{ session.subject_name }}</h3>
        <StatusBadge :state="state" />
        <span v-if="session.rating !== null" class="text-xs font-semibold text-amber-600">
          ★ {{ session.rating }}/5
        </span>
      </div>
      <p class="mt-0.5 text-sm text-muted">Tutor: <span class="font-medium text-slate-700">{{ session.tutor_name }}</span></p>
    </div>

    <div class="flex flex-wrap gap-2">
      <button
        type="button"
        class="rounded-lg px-3 py-2 text-sm font-medium ring-1 ring-slate-200 hover:bg-slate-50"
        @click="$emit('details', session)"
      >
        Detalles
      </button>
      <button
        v-if="state === 'UPCOMING'"
        type="button"
        class="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
        :disabled="!cancellable"
        :title="cancellable ? '' : 'Solo se puede cancelar con 30 minutos de anticipación'"
        @click="$emit('cancel', session)"
      >
        Cancelar
      </button>
      <button
        v-if="rateable"
        type="button"
        class="rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        @click="$emit('rate', session)"
      >
        Calificar tutor
      </button>
    </div>
  </article>
</template>