<script setup lang="ts">
type User = { id: number; full_name: string; email: string; role: string; created_at: string };

const props = defineProps<{ role: "STUDENT" | "ADVISOR"; title: string; singular: string }>();
const api = useApi();

const { data: users, refresh, status } = await useAsyncData(`users-${props.role}`, () =>
  api<User[]>("/api/admin/users", { query: { role: props.role } })
);

const showForm = ref(false);
const editing = ref<User | null>(null);
const form = reactive({ fullName: "", email: "", password: "" });
const error = ref("");
const saving = ref(false);

function openNew() {
  editing.value = null;
  Object.assign(form, { fullName: "", email: "", password: "" });
  error.value = "";
  showForm.value = true;
}

function openEdit(u: User) {
  editing.value = u;
  Object.assign(form, { fullName: u.full_name, email: u.email, password: "" });
  error.value = "";
  showForm.value = true;
}

async function save() {
  error.value = "";
  saving.value = true;
  try {
    if (editing.value) {
      const body: Record<string, string> = { full_name: form.fullName, email: form.email };
      if (form.password) body.password = form.password;
      await api(`/api/admin/users/${editing.value.id}`, { method: "PATCH", body });
    } else {
      await api("/api/admin/users", { method: "POST", body: { ...form, role: props.role } });
    }
    showForm.value = false;
    await refresh();
  } catch (e: any) {
    error.value = apiError(e);
  } finally {
    saving.value = false;
  }
}

async function remove(u: User) {
  if (!confirm(`¿Eliminar a ${u.full_name}? Se borrarán también sus tutorías.`)) return;
  try {
    await api(`/api/admin/users/${u.id}`, { method: "DELETE" });
    await refresh();
  } catch (e: any) {
    alert(apiError(e));
  }
}
</script>

<template>
  <div>
    <div class="mb-6 flex items-center justify-between">
      <h1 class="text-2xl font-bold">{{ title }}</h1>
      <button class="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700" @click="openNew">
        + Agregar {{ singular }}
      </button>
    </div>

    <p v-if="status === 'pending'">Cargando...</p>
    <table v-else class="w-full overflow-hidden rounded-lg bg-white text-left shadow">
      <thead class="bg-gray-100 text-sm text-gray-600">
        <tr>
          <th class="p-3">Nombre</th>
          <th class="p-3">Correo</th>
          <th class="p-3">Registro</th>
          <th class="p-3 text-right">Acciones</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="u in users" :key="u.id" class="border-t">
          <td class="p-3">{{ u.full_name }}</td>
          <td class="p-3">{{ u.email }}</td>
          <td class="p-3">{{ new Date(u.created_at).toLocaleDateString("es-MX") }}</td>
          <td class="space-x-2 p-3 text-right">
            <button class="text-blue-700 hover:underline" @click="openEdit(u)">Editar</button>
            <button class="text-red-600 hover:underline" @click="remove(u)">Eliminar</button>
          </td>
        </tr>
        <tr v-if="!users?.length">
          <td colspan="4" class="p-6 text-center text-gray-500">No hay registros todavía.</td>
        </tr>
      </tbody>
    </table>

    <ModalBox v-if="showForm" :title="editing ? `Editar ${singular}` : `Nuevo ${singular}`" @close="showForm = false">
      <form class="space-y-3" @submit.prevent="save">
        <input v-model="form.fullName" placeholder="Nombre completo" class="w-full rounded border p-2" required />
        <input v-model="form.email" type="email" placeholder="Correo" class="w-full rounded border p-2" required />
        <input
          v-model="form.password" type="password" class="w-full rounded border p-2"
          :placeholder="editing ? 'Nueva contraseña (opcional)' : 'Contraseña (mín. 8 caracteres)'"
          :required="!editing" minlength="8"
        />
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