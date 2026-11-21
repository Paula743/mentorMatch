<script setup lang="ts">
const auth = useAuthStore();
const form = reactive({ email: "", password: "" });
const error = ref("");

async function submit() {
  error.value = "";
  try {
    await auth.login(form.email, form.password);
    await navigateTo("/admin/alumnos");
  } catch (e: any) {
      error.value = e?.data?.error?.message ?? e?.message ?? "No se pudo iniciar sesión";
  }
}
</script>

<template>
  <main class="mx-auto max-w-sm p-6">
    <h1 class="mb-4 text-2xl font-bold">Iniciar sesión</h1>
    <form class="space-y-3" @submit.prevent="submit">
      <input v-model="form.email" type="email" placeholder="Correo" class="w-full rounded border p-2" required />
      <input v-model="form.password" type="password" placeholder="Contraseña" class="w-full rounded border p-2" required />
      <p v-if="error" class="text-red-600">{{ error }}</p>
      <button class="w-full rounded bg-blue-600 p-2 text-white">Entrar</button>
    </form>
    <NuxtLink to="/registro" class="mt-4 block text-sm text-blue-700">Crear cuenta</NuxtLink>
  </main>
</template>