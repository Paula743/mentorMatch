<script setup lang="ts">
definePageMeta({ layout: "admin", middleware: "role", roles: ["ADMIN"] });

type Request = { id: number; full_name: string; email: string; status: "PENDING" | "APPROVED" | "REJECTED"; created_at: string };

const api = useApi();
const filter = ref<"PENDING" | "REJECTED">("PENDING");
const busyId = ref<number | null>(null);
const error = ref("");

const { data: requests, refresh, status } = await useAsyncData(
  "tutor-requests",
  () => api<Request[]>("/api/admin/users", { query: { role: "ADVISOR", status: filter.value } }),
  { watch: [filter] }
);

async function decide(r: Request, next: "APPROVED" | "REJECTED") {
  const verb = next === "APPROVED" ? "aprobar" : "rechazar";
  if (!confirm(`¿Quieres ${verb} a ${r.full_name}?`)) return;
  error.value = "";
  busyId.value = r.id;
  try {
    await api(`/api/admin/users/${r.id}/status`, { method: "PATCH", body: { status: next } });
    await refresh();
  } catch (e: any) {
    error.value = apiError(e);
  } finally {
    busyId.value = null;
  }
}
</script>

<template>
  <div>
    <h1 class="mb-1 text-2xl font-bold">Solicitudes de tutores</h1>
    <p class="mb-4 text-sm text-gray-600">
      Los tutores no pueden iniciar sesión hasta que apruebes su solicitud.
    </p>

    <div class="mb-4 flex gap-2">
      <button
        class="rounded-full border px-3 py-1 text-sm"
        :class="filter === 'PENDING' ? 'border-blue-600 bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'"
        @click="filter = 'PENDING'"
      >Pendientes</button>
      <button
        class="rounded-full border px-3 py-1 text-sm"
        :class="filter === 'REJECTED' ? 'border-blue-600 bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'"
        @click="filter = 'REJECTED'"
      >Rechazadas</button>
    </div>

    <p v-if="error" class="mb-3 text-sm text-red-600">{{ error }}</p>
    <p v-if="status === 'pending'">Cargando...</p>
    <table v-else class="w-full overflow-hidden rounded-lg bg-white text-left shadow">
      <thead class="bg-gray-100 text-sm text-gray-600">
        <tr>
          <th class="p-3">Nombre</th>
          <th class="p-3">Correo</th>
          <th class="p-3">Solicitud</th>
          <th class="p-3 text-right">Acciones</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="r in requests" :key="r.id" class="border-t">
          <td class="p-3">{{ r.full_name }}</td>
          <td class="p-3">{{ r.email }}</td>
          <td class="p-3">{{ new Date(r.created_at).toLocaleDateString("es-MX") }}</td>
          <td class="space-x-2 p-3 text-right">
            <button
              class="rounded bg-green-600 px-3 py-1 text-sm text-white hover:bg-green-700 disabled:opacity-50"
              :disabled="busyId === r.id" @click="decide(r, 'APPROVED')"
            >Aprobar</button>
            <button
              v-if="r.status === 'PENDING'"
              class="rounded border border-red-300 px-3 py-1 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
              :disabled="busyId === r.id" @click="decide(r, 'REJECTED')"
            >Rechazar</button>
          </td>
        </tr>
        <tr v-if="!requests?.length">
          <td colspan="4" class="p-6 text-center text-gray-500">
            {{ filter === "PENDING" ? "No hay solicitudes pendientes." : "No hay solicitudes rechazadas." }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
