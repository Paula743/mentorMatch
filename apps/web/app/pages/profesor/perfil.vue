<script setup lang="ts">
definePageMeta({ layout: "professor", middleware: "role", roles: ["ADVISOR"] });

type ProfileResponse = {
  profile: { bio: string; career_name: string; semesters_completed: number; semesters_total: number } | null;
  subjects: { id: number; name: string }[];
  complete: boolean;
};

const api = useApi();
const auth = useAuthStore();
const BIO_MAX = 600;

const { data } = await useAsyncData("tutor-profile", async () => (await api<{ data: ProfileResponse }>("/api/tutors/me/profile")).data);
const { data: catalog } = await useAsyncData("subjects-catalog", async () => (await api<{ data: { id: number; name: string }[] }>("/api/subjects")).data);

const form = reactive({
  bio: data.value?.profile?.bio ?? "",
  careerName: data.value?.profile?.career_name ?? "",
  semestersCompleted: data.value?.profile?.semesters_completed ?? 0,
  semestersTotal: data.value?.profile?.semesters_total ?? 9,
});
const subjects = ref<string[]>((data.value?.subjects ?? []).map((s) => s.name));
const newSubject = ref("");
const error = ref("");
const saved = ref(false);
const saving = ref(false);

const suggestions = computed(() =>
  (catalog.value ?? []).map((s) => s.name).filter((n) => !subjects.value.some((x) => x.toLowerCase() === n.toLowerCase()))
);

function addSubject() {
  const name = newSubject.value.trim().replace(/\s+/g, " ");
  newSubject.value = "";
  if (!name) return;
  if (subjects.value.some((s) => s.toLowerCase() === name.toLowerCase())) return;
  if (subjects.value.length >= 10) {
    error.value = "Puedes agregar hasta 10 materias";
    return;
  }
  error.value = "";
  subjects.value.push(name);
}

function removeSubject(name: string) {
  subjects.value = subjects.value.filter((s) => s !== name);
}

async function save() {
  error.value = "";
  saved.value = false;
  if (newSubject.value.trim()) addSubject();
  saving.value = true;
  try {
    await api("/api/tutors/me/profile", {
      method: "PUT",
      body: {
        bio: form.bio.trim(),
        career_name: form.careerName.trim(),
        semesters_completed: Number(form.semestersCompleted),
        semesters_total: Number(form.semestersTotal),
        subjects: subjects.value,
      },
    });
    saved.value = true;
    await refreshNuxtData("tutor-summary");
  } catch (e: any) {
    error.value = apiError(e);
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div class="max-w-4xl">
    <h1 class="mb-1 text-2xl font-bold">Editar perfil</h1>
    <p class="mb-6 text-sm text-gray-600">Esto es lo que verán los alumnos al elegir a su tutor.</p>

    <div class="grid gap-6 lg:grid-cols-3">
      <form class="space-y-5 rounded-lg bg-white p-6 shadow lg:col-span-2" @submit.prevent="save">
        <label class="block text-sm font-medium text-gray-700">
          Presentación
          <textarea
            v-model="form.bio" rows="5" :maxlength="BIO_MAX" required
            placeholder="Cuéntales a los alumnos quién eres y cómo te gusta ayudar (mín. 20 caracteres)"
            class="mt-1 w-full rounded border p-2 font-normal"
          />
          <span class="block text-right text-xs font-normal text-gray-500">{{ form.bio.length }} / {{ BIO_MAX }}</span>
        </label>

        <label class="block text-sm font-medium text-gray-700">
          Carrera
          <input v-model="form.careerName" required maxlength="120" placeholder="Ej. Ingeniería en Sistemas Computacionales" class="mt-1 w-full rounded border p-2 font-normal" />
        </label>

        <div class="grid grid-cols-2 gap-4">
          <label class="block text-sm font-medium text-gray-700">
            Semestres cursados
            <input v-model.number="form.semestersCompleted" type="number" min="0" max="20" required class="mt-1 w-full rounded border p-2 font-normal" />
          </label>
          <label class="block text-sm font-medium text-gray-700">
            Total de semestres de la carrera
            <input v-model.number="form.semestersTotal" type="number" min="1" max="20" required class="mt-1 w-full rounded border p-2 font-normal" />
          </label>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700" for="new-subject">Materias que asesoras</label>
          <div class="mt-1 flex gap-2">
            <input
              id="new-subject" v-model="newSubject" list="subject-suggestions" maxlength="60"
              placeholder="Escribe una materia y presiona Enter" class="w-full rounded border p-2"
              @keydown.enter.prevent="addSubject"
            />
            <button type="button" class="rounded border px-4 py-2 hover:bg-gray-50" @click="addSubject">Agregar</button>
          </div>
          <datalist id="subject-suggestions">
            <option v-for="s in suggestions" :key="s" :value="s" />
          </datalist>
          <ul class="mt-3 flex flex-wrap gap-2">
            <li
              v-for="s in subjects" :key="s"
              class="flex items-center gap-1 rounded-full bg-brand-100 px-3 py-1 text-sm font-medium text-brand-700"
            >
              {{ s }}
              <button type="button" class="ml-1 text-brand-700 hover:text-red-600" :aria-label="`Quitar ${s}`" @click="removeSubject(s)">×</button>
            </li>
            <li v-if="!subjects.length" class="text-sm text-gray-500">Agrega al menos una materia.</li>
          </ul>
        </div>

        <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
        <p v-if="saved" class="text-sm text-green-700">Perfil guardado. Ya eres visible para los alumnos.</p>
        <div class="flex justify-end">
          <button class="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50" :disabled="saving">
            {{ saving ? "Guardando..." : "Guardar perfil" }}
          </button>
        </div>
      </form>

      <aside class="h-fit rounded-lg bg-white p-6 shadow">
        <p class="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Así te verán los alumnos</p>
        <p class="font-semibold">{{ auth.user?.full_name }}</p>
        <p class="text-sm text-gray-600">{{ form.careerName || "Tu carrera" }}</p>
        <div class="my-4">
          <CareerProgress :completed="Number(form.semestersCompleted) || 0" :total="Number(form.semestersTotal) || 0" />
        </div>
        <p class="whitespace-pre-line text-sm text-gray-700">{{ form.bio || "Tu presentación aparecerá aquí." }}</p>
        <ul class="mt-4 flex flex-wrap gap-2">
          <li v-for="s in subjects" :key="s" class="rounded-full bg-brand-100 px-3 py-1 text-xs font-medium text-brand-700">{{ s }}</li>
        </ul>
      </aside>
    </div>
  </div>
</template>
