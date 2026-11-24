<script setup lang="ts">
const auth = useAuthStore();
const form = reactive({ email: "", password: "" });
const error = ref("");
const loading = ref(false);
const route = useRoute();

function getErrorMessage(e: any, fallback: string): string {
  const status = e?.statusCode ?? e?.status;
  const err = e?.data?.error;

  if (err?.details?.length) {
    return err.details.map((d: { message: string }) => d.message).join(". ");
  }
  if (status === 401) return "Correo o contraseña incorrectos";
  return err?.message ?? fallback;
}

async function submit() {
  error.value = "";
  loading.value = true;

  try {
    await auth.login(form.email, form.password);
    await navigateTo(homeFor(auth.user?.role));
  } catch (e: any) {
    error.value =getErrorMessage(e,"Credenciales inválidas. No se logro iniciar sesión.");
  } finally{
    loading.value = false;

  }
}

const notice = computed(() => {
  if (route.query.registered === "advisor")
    return "Cuenta creada. Un administrador debe aprobarla antes de que puedas iniciar sesión.";
  if (route.query.registered === "student")
    return "Cuenta creada. Ya puedes iniciar sesión.";
  return "";
});

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

        <p v-if="notice" class="mt-4 rounded-lg bg-brand-50 px-4 py-3 text-sm text-brand-700 ring-1 ring-brand-100">
          {{ notice }}
        </p>
        
        <form class="mt-6 space-y-4" @submit.prevent="submit">
          <BaseInput v-model="form.email" label="Correo Institucional" type="email" />
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
