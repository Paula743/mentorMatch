<script setup lang="ts">
import type { Session, Tutor } from "~/types/student";
definePageMeta({ layout: "student", middleware: "auth" });

//Datos de ejemplo por el momento
const at = (h: number) => new Date(Date.now() + h * 3600_000).toISOString();

const tutors = useState<Tutor[]>("student-tutors", () => [
  {
    id: 1, 
    full_name: "Elena Valenzuela", 
    career: "Ingeniería en Sistemas", 
    rating_avg: 4.9,
    subjects: [{ id: 1, name: "Estructuras de datos" }, { id: 2, name: "Grafos" }],
    slots: [
      { id: 10, starts_at: at(26), ends_at: at(27) },
      { id: 11, starts_at: at(30), ends_at: at(31) },
      { id: 12, starts_at: at(50), ends_at: at(51) },
      { id: 13, starts_at: at(74), ends_at: at(75) },
    ],
  },
  {
    id: 2, 
    full_name: "Javier Morales", 
    career: "Física Aplicada", 
    rating_avg: 4.7,
    subjects: [{ id: 3, name: "Termodinámica" }, { id: 4, name: "Mecánica clásica" }],
    slots: [
      { id: 20, starts_at: at(28), ends_at: at(29) }, 
      { id: 21, starts_at: at(52), ends_at: at(53) }],
  },
  {
    id: 3, 
    full_name: "Mariana Ortiz", 
    career: "Bioestadística", 
    rating_avg: null,
    subjects: [
      { id: 5, name: "Regresión lineal" }, 
      { id: 1, name: "Estructuras de datos" }],
    slots: [],
  },
  {
    id: 4, 
    full_name: "Ulises Negrete", 
    career: "Mecatronica", 
    rating_avg: 5,
    subjects: [
      { id: 3, name: "Termodinámica" }, 
      { id: 5, name: "Regresión lineal" }],
    slots: [],
  },
]);

const sessions = useState<Session[]>("student-sessions", () => [
  { 
    id: 1, 
    status: "CONFIRMED", 
    starts_at: at(48), 
    ends_at: at(49), 
    tutor_name: "Elena Valenzuela", 
    subject_name: "Grafos", 
    rating: null },
  { 
    id: 2, 
    status: "CONFIRMED", 
    starts_at: at(0.4), 
    ends_at: at(1.4), 
    tutor_name: "Javier Morales", 
    subject_name: "Termodinámica", 
    rating: null },
  { 
    id: 3, 
    status: "CONFIRMED", 
    starts_at: at(-50), 
    ends_at: at(-49), 
    tutor_name: "Elena Valenzuela", 
    subject_name: "Estructuras de datos", 
    rating: null },
  { 
    id: 4, 
    status: "CONFIRMED", 
    starts_at: at(-120), 
    ends_at: at(-119), 
    tutor_name: "Javier Morales", 
    subject_name: "Mecánica clásica", 
    rating: 5 },
  { id: 5, 
    status: "CANCELLED", 
    starts_at: at(-30), 
    ends_at: at(-29), 
    tutor_name: "Mariana Ortiz", 
    subject_name: "Regresión lineal", 
    rating: null },
]);

// filtro por materia 
const selectedSubject = ref<number | null>(null);

const subjects = computed(() => {
  const all = tutors.value.flatMap((t) => t.subjects);
  return all.filter((s, i) => all.findIndex((x) => x.id === s.id) === i);
});

const filteredTutors = computed(() =>
  selectedSubject.value === null
    ? tutors.value
    : tutors.value.filter((t) => t.subjects.some((s) => s.id === selectedSubject.value))
);

// modal de reservar
const bookingTutor = ref<Tutor | null>(null);

function confirmBooking(p: { subject_id: number; slot_id: number }) {
  const t = bookingTutor.value;
  if (!t) return;
  const slot = t.slots.find((s) => s.id === p.slot_id);
  const subject = t.subjects.find((s) => s.id === p.subject_id);
  if (!slot || !subject) return;

  sessions.value.unshift({
    id: Date.now(), status: "CONFIRMED",
    starts_at: slot.starts_at, ends_at: slot.ends_at,
    tutor_name: t.full_name, subject_name: subject.name, rating: null,
  });
  t.slots = t.slots.filter((s) => s.id !== slot.id);
  bookingTutor.value = null;
}

// filtros de historial de reservas
type Filter = "ALL" | "UPCOMING" | "COMPLETED";
const filter = ref<Filter>("ALL");

const filters: { value: Filter; label: string }[] = [
  { value: "ALL", label: "Todas" },
  { value: "UPCOMING", label: "Confirmadas" },
  { value: "COMPLETED", label: "Completadas" },
];

const count = (f: Filter) =>
  f === "ALL" ? sessions.value.length : sessions.value.filter((s) => sessionState(s) === f).length;

const filteredSessions = computed(() =>
  sessions.value
    .filter((s) => filter.value === "ALL" || sessionState(s) === filter.value)
    .sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime())
);

// acciones sobre una seccion
const detailsTarget = ref<Session | null>(null);
const rateTarget = ref<Session | null>(null);
const rateValue = ref<number | null>(null);

function cancelSession(s: Session) {
  if (!canCancel(s)) return;
  if (!confirm(`¿Cancelar tu asesoría de ${s.subject_name}?`)) return;
  s.status = "CANCELLED";
}

function openRate(s: Session) {
  rateTarget.value = s;
  rateValue.value = null;
}

function saveRating() {
  if (!rateTarget.value || !rateValue.value) return;
  rateTarget.value.rating = rateValue.value;
  rateTarget.value = null;
}
</script>

<template>
  <div class="mx-auto max-w-6xl space-y-12">
    <!-- Reservar nueva asesoría -->
    <section>
      <h1 class="text-2xl font-bold">Reservar nueva asesoría</h1>
      <p class="mt-1 text-sm text-muted">Encuentra al tutor ideal y elige el horario que te convenga.</p>

      <label class="mt-4 block max-w-xs">
        <span class="mb-1 block text-sm font-medium text-slate-700">Materia</span>
        <select
          v-model="selectedSubject"
          class="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
        >
          <option :value="null">Todas las materias</option>
          <option v-for="s in subjects" :key="s.id" :value="s.id">{{ s.name }}</option>
        </select>
      </label>

      <div v-if="filteredTutors.length" class="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <TutorCard v-for="t in filteredTutors" :key="t.id" :tutor="t" @reserve="bookingTutor = $event" />
      </div>
      <p v-else class="mt-6 rounded-2xl bg-white p-8 text-center text-muted ring-1 ring-slate-200">
        Ningún tutor da esa materia por ahora.
      </p>
    </section>

    <!-- Historial y próximas reservaciones -->
    <section>
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 class="text-2xl font-bold">Historial y próximas reservaciones</h2>
          <p class="mt-1 text-sm text-muted">Gestiona tus asesorías y califica a tus tutores.</p>
        </div>
        <div class="flex gap-1 rounded-xl bg-slate-100 p-1">
          <button
            v-for="f in filters"
            :key="f.value"
            type="button"
            class="rounded-lg px-3 py-1.5 text-sm font-medium transition"
            :class="filter === f.value ? 'bg-white text-brand-700 shadow-sm' : 'text-muted'"
            @click="filter = f.value"
          >
            {{ f.label }} ({{ count(f.value) }})
          </button>
        </div>
      </div>

      <div v-if="filteredSessions.length" class="mt-6 space-y-3">
        <SessionCard
          v-for="s in filteredSessions"
          :key="s.id"
          :session="s"
          @details="detailsTarget = $event"
          @cancel="cancelSession"
          @rate="openRate"
        />
      </div>
      <p v-else class="mt-6 rounded-2xl bg-white p-8 text-center text-muted ring-1 ring-slate-200">
        No hay sesiones en esta categoría.
      </p>
    </section>

    <!-- Modal: reservar -->
    <BookingModal
      v-if="bookingTutor"
      :tutor="bookingTutor"
      @close="bookingTutor = null"
      @confirm="confirmBooking"
    />

    <!-- Modal: detalles -->
    <ModalBox v-if="detailsTarget" title="Detalles de la asesoría" @close="detailsTarget = null">
      <dl class="space-y-3 text-sm">
        <div><dt class="text-muted">Tutor</dt><dd class="font-medium">{{ detailsTarget.tutor_name }}</dd></div>
        <div><dt class="text-muted">Materia</dt><dd class="font-medium">{{ detailsTarget.subject_name }}</dd></div>
        <div>
          <dt class="text-muted">Fecha y hora</dt>
          <dd class="font-medium">{{ formatRange(detailsTarget.starts_at, detailsTarget.ends_at) }}</dd>
        </div>
        <div>
          <dt class="text-muted">Estado</dt>
          <dd><StatusBadge :state="sessionState(detailsTarget)" /></dd>
        </div>
        <div v-if="detailsTarget.rating !== null">
          <dt class="text-muted">Tu calificación</dt>
          <dd><StarRating :model-value="detailsTarget.rating" readonly small /></dd>
        </div>
      </dl>
    </ModalBox>

    <!-- Modal: calificar -->
    <ModalBox v-if="rateTarget" title="Calificar tutor" @close="rateTarget = null">
      <p class="text-sm text-muted">
        ¿Cómo fue tu asesoría de <strong>{{ rateTarget.subject_name }}</strong> con {{ rateTarget.tutor_name }}?
      </p>
      <div class="my-4 flex justify-center"><StarRating v-model="rateValue" /></div>
      <div class="flex justify-end gap-2">
        <button type="button" class="rounded-lg border border-slate-200 px-4 py-2" @click="rateTarget = null">
          Cancelar
        </button>
        <button
          type="button"
          class="rounded-lg bg-brand-600 px-4 py-2 font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
          :disabled="!rateValue"
          @click="saveRating"
        >
          Guardar calificación
        </button>
      </div>
    </ModalBox>
  </div>
</template>