<script setup lang="ts">
definePageMeta({ layout: "admin", middleware: "role", roles: ["ADMIN"] });

type Booking = {
  id: number;
  status: "CONFIRMED" | "CANCELLED";
  student_id: number;
  student_name: string;
  professor_id: number;
  professor_name: string;
  starts_at: string;
  ends_at: string;
};
type User = { id: number; full_name: string };

const api = useApi();
const { data: bookings, refresh, status } = await useAsyncData("bookings", () =>
  api<Booking[]>("/api/admin/bookings")
);
const { data: students } = await useAsyncData("opt-students", () =>
  api<User[]>("/api/admin/users", { query: { role: "STUDENT" } })
);
const { data: professors } = await useAsyncData("opt-professors", () =>
  api<User[]>("/api/admin/users", { query: { role: "ADVISOR" } })
);

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" });

const toLocalInput = (iso: string) => {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

const showForm = ref(false);
const editing = ref<Booking | null>(null);
const form = reactive({ studentId: "", professorId: "", startsAt: "", endsAt: "", status: "CONFIRMED" });
const error = ref("");
const saving = ref(false);

function openNew() {
  editing.value = null;
  Object.assign(form, { studentId: "", professorId: "", startsAt: "", endsAt: "", status: "CONFIRMED" });
  error.value = "";
  showForm.value = true;
}

function openEdit(b: Booking) {
  editing.value = b;
  Object.assign(form, {
    studentId: String(b.student_id),
    professorId: String(b.professor_id),
    startsAt: toLocalInput(b.starts_at),
    endsAt: toLocalInput(b.ends_at),
    status: b.status,
  });
  error.value = "";
  showForm.value = true;
}

async function save() {
  error.value = "";
  saving.value = true;
  const body = {
    studentId: Number(form.studentId),
    professorId: Number(form.professorId),
    startsAt: new Date(form.startsAt).toISOString(),
    endsAt: new Date(form.endsAt).toISOString(),
    ...(editing.value ? { status: form.status } : {}),
  };
  try {
    if (editing.value) {
      await api(`/api/admin/bookings/${editing.value.id}`, { method: "PATCH", body });
    } else {
      await api("/api/admin/bookings", { method: "POST", body });
    }
    showForm.value = false;
    await refresh();
  } catch (e: any) {
    error.value = apiError(e);
  } finally {
    saving.value = false;
  }
}

async function remove(b: Booking) {
  if (!confirm("¿Eliminar esta tutoría? El horario quedará libre.")) return;
  try {
    await api(`/api/admin/bookings/${b.id}`, { method: "DELETE" });
    await refresh();
  } catch (e: any) {
    alert(apiError(e));
  }
}
</script>

<template>
  <div>
    <div class="mb-6 flex items-center justify-between">
      <h1 class="text-2xl font-bold">Tutorías agendadas</h1>
      <button class="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700" @click="openNew">
        + Agendar tutoría
      </button>
    </div>

    <p v-if="status === 'pending'">Cargando...</p>
    <table v-else class="w-full overflow-hidden rounded-lg bg-white text-left shadow">
      <thead class="bg-gray-100 text-sm text-gray-600">
        <tr>
          <th class="p-3">Alumno</th>
          <th class="p-3">Profesor</th>
          <th class="p-3">Inicio</th>
          <th class="p-3">Fin</th>
          <th class="p-3">Estado</th>
          <th class="p-3 text-right">Acciones</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="b in bookings" :key="b.id" class="border-t">
          <td class="p-3">{{ b.student_name }}</td>
          <td class="p-3">{{ b.professor_name }}</td>
          <td class="p-3">{{ fmt(b.starts_at) }}</td>
          <td class="p-3">{{ fmt(b.ends_at) }}</td>
          <td class="p-3">
            <span
              class="rounded px-2 py-1 text-xs font-semibold"
              :class="b.status === 'CONFIRMED' ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700'"
            >
              {{ b.status === "CONFIRMED" ? "Confirmada" : "Cancelada" }}
            </span>
          </td>
          <td class="space-x-2 p-3 text-right">
            <button class="text-blue-700 hover:underline" @click="openEdit(b)">Editar</button>
            <button class="text-red-600 hover:underline" @click="remove(b)">Eliminar</button>
          </td>
        </tr>
        <tr v-if="!bookings?.length">
          <td colspan="6" class="p-6 text-center text-gray-500">No hay tutorías agendadas.</td>
        </tr>
      </tbody>
    </table>

    <ModalBox v-if="showForm" :title="editing ? 'Editar tutoría' : 'Agendar tutoría'" @close="showForm = false">
      <form class="space-y-3" @submit.prevent="save">
        <select v-model="form.studentId" class="w-full rounded border p-2" required>
          <option value="" disabled>Alumno...</option>
          <option v-for="s in students" :key="s.id" :value="String(s.id)">{{ s.full_name }}</option>
        </select>
        <select v-model="form.professorId" class="w-full rounded border p-2" required>
          <option value="" disabled>Profesor...</option>
          <option v-for="p in professors" :key="p.id" :value="String(p.id)">{{ p.full_name }}</option>
        </select>
        <label class="block text-sm text-gray-600">
          Inicio
          <input v-model="form.startsAt" type="datetime-local" class="w-full rounded border p-2" required />
        </label>
        <label class="block text-sm text-gray-600">
          Fin
          <input v-model="form.endsAt" type="datetime-local" class="w-full rounded border p-2" required />
        </label>
        <select v-if="editing" v-model="form.status" class="w-full rounded border p-2">
          <option value="CONFIRMED">Confirmada</option>
          <option value="CANCELLED">Cancelada</option>
        </select>
        <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
        <div class="flex justify-end gap-2 pt-2">
          <button type="button" class="rounded border px-4 py-2" @click="showForm = false">Cancelar</button>
          <button class="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50" :disabled="saving">
            {{ saving ? "Guardando..." : "Guardar" }}
          </button>
        </div>
      </form>
    </ModalBox>
  </div>
</template>