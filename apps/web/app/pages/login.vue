<script setup lang="ts">
const auth = useAuthStore();
const form = reactive({ email: "", password: "" });
const error = ref("");
const loading = ref(false);

async function submit() {
  error.value = "";
  loading.value = true;

  try {
    await auth.login(form.email, form.password);
    await navigateTo("/");
  } catch (e: any) {
    error.value = e?.data?.error?.message ?? e?.message ?? "Credenciales inválidas";
  } finally{
    loading.value = false;
  }
}

</script>

<template>
  <div class="grid min-h-screen lg:grid-cols-2">
    <!-- Panel -->
    <AuthBrandPanel />

    <!-- Formulario -->
    <main class="flex items-center justify-center p-6">
      <div class="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
        <h1 class="text-2xl font-bold">Bienvenido de nuevo</h1>
        <p class="mt-1 text-sm text-muted">Ingresa a tu cuenta para gestionar tus asesorías.</p>

        <form class="mt-6 space-y-4" @submit.prevent="submit">
          <BaseInput v-model="form.email" label="Correo" type="email" />
          <BaseInput v-model="form.password" label="Contraseña" type="password" />
          <p v-if="error" class="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">
            {{ error }}
          </p>
          <BaseButton :loading="loading">Iniciar sesión</BaseButton>
        </form>

        <p class="mt-6 text-center text-sm text-muted">
          ¿Aún no tienes cuenta?
          <NuxtLink to="/registro" class="font-semibold text-brand-600">Regístrate</NuxtLink>
        </p>
      </div>
    </main>
  </div>
</template>
