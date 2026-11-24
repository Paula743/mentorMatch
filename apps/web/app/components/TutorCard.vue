<script setup lang="ts">
import type { Tutor } from "~/types/student";

const props = defineProps<{ tutor: Tutor }>();
defineEmits<{ reserve: [tutor: Tutor] }>();

const initials = computed(() =>
  props.tutor.full_name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("")
);

const visibleSlots = computed(() => props.tutor.slots.slice(0, 3));
const extraSlots = computed(() => Math.max(0, props.tutor.slots.length - 3));
</script>

<template>
  <article class="flex flex-col rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
    <div class="flex items-center gap-3">
      <span class="grid size-12 shrink-0 place-items-center rounded-full bg-brand-100 font-bold text-brand-700">
        {{ initials }}
      </span>
      <div class="min-w-0">
        <h3 class="truncate font-semibold">{{ tutor.full_name }}</h3>
        <p class="truncate text-sm text-muted">{{ tutor.career }}</p>
      </div>
    </div>

    <p class="mt-3 text-sm">
      <template v-if="tutor.rating_avg !== null">
        <span class="text-amber-400">★</span>
        <span class="font-semibold">{{ tutor.rating_avg.toFixed(1) }}</span>
      </template>
      <span v-else class="text-muted">Sin calificaciones</span>
    </p>

    <div class="mt-3 flex flex-wrap gap-1.5">
      <span
        v-for="s in tutor.subjects"
        :key="s.id"
        class="rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700"
      >
        {{ s.name }}
      </span>
    </div>

    <div class="mt-4 rounded-xl bg-slate-50 p-3">
      <p class="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Próximos horarios</p>
      <div v-if="tutor.slots.length" class="flex flex-wrap gap-1.5">
        <span
          v-for="slot in visibleSlots"
          :key="slot.id"
          class="rounded-md bg-white px-2 py-1 text-xs font-medium ring-1 ring-slate-200"
        >
          {{ formatSlot(slot.starts_at) }}
        </span>
        <span v-if="extraSlots > 0" class="px-1 py-1 text-xs font-semibold text-brand-600">
          +{{ extraSlots }}
        </span>
      </div>
      <p v-else class="text-sm text-muted">Sin horarios disponibles</p>
    </div>

    <div class="mt-auto pt-4">
      <button
        type="button"
        class="w-full rounded-lg bg-brand-600 px-4 py-3 font-semibold text-white transition hover:bg-brand-700 focus:outline-none focus:ring-4 focus:ring-brand-100 disabled:cursor-not-allowed disabled:opacity-50"
        :disabled="!tutor.slots.length"
        @click="$emit('reserve', tutor)"
      >
        Reservar asesoría
      </button>
    </div>
  </article>
</template>