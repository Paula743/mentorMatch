<script setup lang="ts">
definePageMeta({ layout: "professor", middleware: "role", roles: ["ADVISOR"] });

type Summary = {
  upcoming: number; taught: number; avg_rating: number | null; rating_count: number;
  pending_proposals: number; profile_complete: boolean;
};
type Booking = {
  id: number; starts_at: string; ends_at: string; subject: string | null;
  student: { id: number; full_name: string };
};

const auth = useAuthStore();
const api = useApi();

const { data: summary, error } = await useAsyncData("tutor-summary", async () => (await api<{ data: Summary }>("/api/tutors/me/summary")).data);
const { data: next } = await useAsyncData("tutor-next", async () =>
  (await api<{ data: Booking[] }>("/api/tutors/me/bookings", { query: { scope: "upcoming" } })).data.slice(0, 3)
);

const cards = computed(() => [
  { label: "Asesorías próximas", value: summary.value?.upcoming, to: "/profesor/agendadas" },
  { label: "Asesorías impartidas", value: summary.value?.taught, to: "/profesor/pasadas" },
  {
    label: summary.value?.rating_count ? `Tu calificación (${summary.value.rating_count})` : "Tu calificación",
    value: summary.value?.avg_rating != null ? `${summary.value.avg_rating.toFixed(1)} ★` : "—",
    to: "/profesor/pasadas",
  },
  { label: "Propuestas pendientes", value: summary.value?.pending_proposals, to: "/profesor/agendadas" },
]);
</script>

<template>
  <div>
    <h1 class="mb-6 text-2xl font-bold">Hola, {{ auth.user?.full_name }}</h1>

    <p v-if="error" class="mb-4 text-red-600">No se pudo cargar tu resumen.</p>

    <NuxtLink
      v-if="summary && !summary.profile_complete"
      to="/profesor/perfil"
      class="mb-6 flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-900 shadow-sm hover:bg-amber-100"
    >
      <span class="mt-0.5 text-xl" aria-hidden="true">⚠️</span>
      <span>
        <span class="block font-semibold">Completa tu perfil para que los alumnos puedan agendar contigo</span>
        <span class="block text-sm">
          Agrega tu presentación, tu carrera y las materias que asesoras. Haz clic aquí para ir a Editar perfil.
        </span>
      </span>
    </NuxtLink>

    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <NuxtLink
        v-for="c in cards" :key="c.label" :to="c.to"
        class="rounded-lg bg-white p-5 shadow hover:shadow-md"
      >
        <p class="text-sm text-gray-500">{{ c.label }}</p>
        <p class="mt-1 text-4xl font-bold text-slate-900">{{ c.value ?? "-" }}</p>
      </NuxtLink>
    </div>

    <section class="mt-8">
      <div class="mb-3 flex items-center justify-between">
        <h2 class="text-lg font-semibold">Próximas asesorías</h2>
        <NuxtLink to="/profesor/agendadas" class="text-sm text-blue-700 hover:underline">Ver todas</NuxtLink>
      </div>
      <ul v-if="next?.length" class="divide-y rounded-lg bg-white shadow">
        <li v-for="b in next" :key="b.id" class="flex items-center justify-between gap-4 p-4">
          <div>
            <p class="font-medium capitalize">{{ fmtDate(b.starts_at) }}, {{ fmtTime(b.starts_at) }}</p>
            <p class="text-sm text-gray-600">{{ b.student.full_name }} · {{ b.subject ?? "Sin materia" }}</p>
          </div>
        </li>
      </ul>
      <p v-else class="rounded-lg bg-white p-6 text-center text-gray-500 shadow">
        Aún no tienes asesorías agendadas.
      </p>
    </section>
  </div>
</template>
