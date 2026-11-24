<script setup lang="ts">
definePageMeta({ layout: "professor", middleware: "role", roles: ["ADVISOR"] });

type Availability = {
  week_start: string; now: { date: string; hour: number };
  first_hour: number; last_hour: number;
  template: { weekday: number; hour: number }[];
  booked: { date: string; hour: number }[];
  blocked: { date: string; hour: number }[];
};

const api = useApi();
const { data, refresh } = await useAsyncData("tutor-availability", async () => (await api<{ data: Availability }>("/api/tutors/me/availability")).data);

const selected = ref<Set<string>>(new Set());
const dirty = ref(false);
const saving = ref(false);
const saved = ref(false);
const error = ref("");

const key = (weekday: number, hour: number) => `${weekday}-${hour}`;
function load() {
  selected.value = new Set((data.value?.template ?? []).map((t) => key(t.weekday, t.hour)));
  dirty.value = false;
}
load();

const hours = computed(() => {
  const a = data.value;
  if (!a) return [];
  return Array.from({ length: a.last_hour - a.first_hour + 1 }, (_, i) => a.first_hour + i);
});

// Fecha (YYYY-MM-DD) de cada día de la semana en curso, sumando días a partir del lunes
const days = computed(() => {
  const start = data.value?.week_start;
  if (!start) return [];
  const [y, m, d] = start.split("-").map(Number) as [number, number, number];
  return WEEKDAYS.map((label, i) => {
    const dt = new Date(Date.UTC(y, m - 1, d + i));
    return { weekday: i + 1, label, date: dt.toISOString().slice(0, 10), day: dt.getUTCDate() };
  });
});

type CellState = "open" | "closed" | "booked" | "blocked" | "past";
function stateOf(weekday: number, date: string, hour: number): CellState {
  const a = data.value!;
  if (date < a.now.date || (date === a.now.date && hour <= a.now.hour)) return "past";
  if (a.booked.some((b) => b.date === date && b.hour === hour)) return "booked";
  if (a.blocked.some((b) => b.date === date && b.hour === hour)) return "blocked";
  return selected.value.has(key(weekday, hour)) ? "open" : "closed";
}

function toggle(weekday: number, date: string, hour: number) {
  const st = stateOf(weekday, date, hour);
  if (st === "past" || st === "booked" || st === "blocked") return;
  const next = new Set(selected.value);
  const k = key(weekday, hour);
  next.has(k) ? next.delete(k) : next.add(k);
  selected.value = next;
  dirty.value = true;
  saved.value = false;
}

const classes: Record<CellState, string> = {
  open: "bg-green-100 text-green-800 hover:bg-green-200",
  closed: "bg-gray-50 text-gray-400 hover:bg-gray-100",
  booked: "bg-blue-100 text-blue-800 cursor-not-allowed",
  blocked: "bg-red-50 text-red-400 cursor-not-allowed",
  past: "bg-gray-100 text-gray-300 cursor-not-allowed",
};
const symbols: Record<CellState, string> = { open: "Libre", closed: "—", booked: "Agendada", blocked: "Cancelada", past: "" };

async function save() {
  error.value = "";
  saving.value = true;
  try {
    const slots = [...selected.value].map((k) => {
      const [weekday, hour] = k.split("-").map(Number);
      return { weekday, hour };
    });
    await api("/api/tutors/me/availability", { method: "PUT", body: { slots } });
    await refresh();
    load();
    saved.value = true;
  } catch (e: any) {
    error.value = apiError(e);
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div>
    <div class="mb-2 flex items-center justify-between">
      <h1 class="text-2xl font-bold">Disponibilidad de horarios</h1>
      <div class="flex items-center gap-3">
        <button v-if="dirty" class="rounded border px-4 py-2 hover:bg-gray-50" @click="load">Descartar</button>
        <button
          class="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
          :disabled="!dirty || saving" @click="save"
        >{{ saving ? "Guardando..." : "Guardar horarios" }}</button>
      </div>
    </div>
    <p class="mb-4 text-sm text-gray-600">
      Haz clic en las horas en que puedes dar asesorías esta semana (cada bloque dura 1 hora). Si no los cambias,
      tus horarios se mantienen igual la semana siguiente. Las asesorías ya agendadas no se pierden al quitar una hora.
    </p>

    <p v-if="error" class="mb-3 text-sm text-red-600">{{ error }}</p>
    <p v-if="saved" class="mb-3 text-sm text-green-700">Horarios guardados. Los alumnos ya ven tu nueva disponibilidad.</p>

    <div class="mb-3 flex flex-wrap gap-4 text-xs text-gray-600">
      <span class="flex items-center gap-1"><i class="size-3 rounded bg-green-100 ring-1 ring-green-300" /> Libre</span>
      <span class="flex items-center gap-1"><i class="size-3 rounded bg-gray-50 ring-1 ring-gray-300" /> No disponible</span>
      <span class="flex items-center gap-1"><i class="size-3 rounded bg-blue-100 ring-1 ring-blue-300" /> Asesoría agendada</span>
      <span class="flex items-center gap-1"><i class="size-3 rounded bg-red-50 ring-1 ring-red-300" /> Cancelada por ti (bloqueada)</span>
    </div>

    <div v-if="data" class="overflow-x-auto rounded-lg bg-white shadow">
      <table class="w-full min-w-[720px] border-collapse text-center text-xs">
        <thead class="bg-gray-100 text-sm text-gray-600">
          <tr>
            <th class="w-16 p-2">Hora</th>
            <th v-for="d in days" :key="d.weekday" class="p-2">
              {{ d.label }}
              <span class="block text-xs font-normal text-gray-500">{{ d.day }}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="h in hours" :key="h" class="border-t">
            <th class="p-2 text-xs font-medium text-gray-500">{{ hourLabel(h) }}</th>
            <td v-for="d in days" :key="d.weekday" class="p-1">
              <button
                type="button"
                class="h-8 w-full rounded text-xs font-medium transition"
                :class="classes[stateOf(d.weekday, d.date, h)]"
                :disabled="['past', 'booked', 'blocked'].includes(stateOf(d.weekday, d.date, h))"
                :aria-label="`${d.label} ${hourLabel(h)}`"
                @click="toggle(d.weekday, d.date, h)"
              >{{ symbols[stateOf(d.weekday, d.date, h)] }}</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
