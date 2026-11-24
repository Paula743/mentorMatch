<script setup lang="ts">
import type { Tutor } from "~/types/student";

const props = defineProps<{ tutor: Tutor }>();
const emit = defineEmits<{
  close: [];
  confirm: [payload: { subject_id: number; slot_id: number }];
}>();

const subjectId = ref<number | null>(props.tutor.subjects.length === 1 ? props.tutor.subjects[0]!.id : null);
const slotId = ref<number | null>(null);

const ready = computed(() => subjectId.value !== null && slotId.value !== null);

function submit() {
  if (subjectId.value === null || slotId.value === null) return;
  emit("confirm", { subject_id: subjectId.value, slot_id: slotId.value });
}
</script>

<template>
  <ModalBox :title="`Reservar con ${tutor.full_name}`" @close="emit('close')">
    <form class="space-y-5" @submit.prevent="submit">
      <div>
        <p class="mb-2 text-sm font-medium text-slate-700">Materia</p>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="s in tutor.subjects"
            :key="s.id"
            type="button"
            class="rounded-full px-3 py-1.5 text-sm font-medium ring-1 transition"
            :class="subjectId === s.id
              ? 'bg-brand-600 text-white ring-brand-600'
              : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50'"
            @click="subjectId = s.id"
          >
            {{ s.name }}
          </button>
        </div>
      </div>

      <div>
        <p class="mb-2 text-sm font-medium text-slate-700">Horario</p>
        <div class="grid max-h-56 gap-2 overflow-y-auto sm:grid-cols-2">
          <button
            v-for="slot in tutor.slots"
            :key="slot.id"
            type="button"
            class="rounded-lg px-3 py-2 text-left text-sm ring-1 transition"
            :class="slotId === slot.id
              ? 'bg-brand-50 font-semibold text-brand-700 ring-brand-500'
              : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50'"
            @click="slotId = slot.id"
          >
            {{ formatRange(slot.starts_at, slot.ends_at) }}
          </button>
        </div>
      </div>

      <div class="flex justify-end gap-2 pt-1">
        <button type="button" class="rounded-lg border border-slate-200 px-4 py-2" @click="emit('close')">
          Cancelar
        </button>
        <button
          class="rounded-lg bg-brand-600 px-4 py-2 font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
          :disabled="!ready"
        >
          Confirmar reserva
        </button>
      </div>
    </form>
  </ModalBox>
</template>