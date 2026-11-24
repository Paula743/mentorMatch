<script setup lang="ts">
definePageMeta({ layout: "admin", middleware: "role", roles: ["ADMIN"] });

const api = useApi();
const { data, error } = await useAsyncData("summary", () =>
  api<{ students: number; professors: number; pending_advisors: number; bookings: number; upcoming: number }>("/api/admin/summary")
);

const cards = computed(() => [
  { label: "Alumnos", value: data.value?.students, to: "/admin/alumnos" },
  { label: "Profesores", value: data.value?.professors, to: "/admin/profesores" },
  { label: "Solicitudes de tutores", value: data.value?.pending_advisors, to: "/admin/solicitudes" },
  { label: "Tutorías agendadas", value: data.value?.bookings, to: "/admin/tutorias" },
  { label: "Próximas tutorías", value: data.value?.upcoming, to: "/admin/tutorias" },
]);
</script>

<template>
  <div>
    <h1 class="mb-6 text-2xl font-bold">Resumen general</h1>
    <p v-if="error" class="text-red-600">No se pudo cargar el resumen.</p>
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      <NuxtLink
        v-for="c in cards" :key="c.label" :to="c.to"
        class="rounded-lg bg-white p-5 shadow hover:shadow-md"
      >
        <p class="text-sm text-gray-500">{{ c.label }}</p>
        <p class="mt-1 text-4xl font-bold text-slate-900">{{ c.value ?? "-" }}</p>
      </NuxtLink>
    </div>
  </div>
</template>