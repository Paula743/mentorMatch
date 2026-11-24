<script setup lang="ts">
definePageMeta({ layout: "professor", middleware: "role", roles: ["ADVISOR"] });

type Booking = {
  id: number; starts_at: string; ends_at: string; subject: string | null;
  student: { id: number; full_name: string };
  review: { rating: number; comment: string | null } | null;
};

const api = useApi();
const { data: bookings, status } = await useAsyncData("tutor-past", async () =>
  (await api<{ data: Booking[] }>("/api/tutors/me/bookings", { query: { scope: "past" } })).data
);

type Filter = "all" | "comment" | "low";
const filter = ref<Filter>("all");
const filters: { id: Filter; label: string }[] = [
  { id: "all", label: "Todas" },
  { id: "comment", label: "Con comentario" },
  { id: "low", label: "Calificación baja (3 o menos)" },
];

const shown = computed(() =>
  (bookings.value ?? []).filter((b) => {
    if (filter.value === "comment") return !!b.review?.comment;
    if (filter.value === "low") return !!b.review && b.review.rating <= 3;
    return true;
  })
);
</script>

<template>
  <div>
    <h1 class="mb-1 text-2xl font-bold">Asesorías pasadas</h1>
    <p class="mb-4 text-sm text-gray-600">
      Revisa cómo calificaron tus asesorías para dar seguimiento a los alumnos que lo necesiten.
    </p>

    <div class="mb-4 flex flex-wrap gap-2">
      <button
        v-for="f in filters" :key="f.id"
        class="rounded-full border px-3 py-1 text-sm"
        :class="filter === f.id ? 'border-blue-600 bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'"
        @click="filter = f.id"
      >{{ f.label }}</button>
    </div>

    <p v-if="status === 'pending'">Cargando...</p>
    <ul v-else-if="shown.length" class="space-y-3">
      <li v-for="b in shown" :key="b.id" class="rounded-lg bg-white p-5 shadow">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p class="font-semibold capitalize">{{ fmtRange(b.starts_at, b.ends_at) }}</p>
            <p class="mt-1 text-sm text-gray-700">
              Alumno: <span class="font-medium">{{ b.student.full_name }}</span>
            </p>
            <p class="mt-2">
              <span class="rounded-full bg-brand-100 px-3 py-1 text-xs font-medium text-brand-700">{{ b.subject ?? "Sin materia" }}</span>
            </p>
          </div>
          <div v-if="b.review" class="text-right" :aria-label="`Calificación ${b.review.rating} de 5`">
            <p class="text-xl tracking-wider text-amber-500">
              {{ "★".repeat(b.review.rating) }}<span class="text-gray-300">{{ "★".repeat(5 - b.review.rating) }}</span>
            </p>
            <p class="text-xs text-gray-500">{{ b.review.rating }} de 5</p>
          </div>
          <span v-else class="rounded bg-gray-200 px-2 py-1 text-xs font-semibold text-gray-700">Sin calificar</span>
        </div>
        <p v-if="b.review?.comment" class="mt-3 rounded bg-gray-50 p-3 text-sm italic text-gray-700">“{{ b.review.comment }}”</p>
      </li>
    </ul>
    <p v-else class="rounded-lg bg-white p-6 text-center text-gray-500 shadow">
      {{ filter === "all" ? "Todavía no has impartido asesorías." : "No hay asesorías con ese filtro." }}
    </p>
  </div>
</template>
