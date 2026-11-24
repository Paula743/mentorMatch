<script setup lang="ts">
const auth = useAuthStore();
const form = reactive({ 
  fullName: "", 
  email: "", 
  password: "",
  role: "STUDENT" as "STUDENT" | "ADVISOR",
});
const error = ref("");
const loading = ref(false);
const waitingApproval = ref(false);

function validate(): string {
  if (form.fullName.trim().length < 2) return "El nombre debe tener al menos 2 caracteres";
  if (form.password.length < 8) return "La contraseña debe tener al menos 8 caracteres";
  if (!/[A-Za-z]/.test(form.password)) return "La contraseña debe incluir al menos una letra";
  if (!/\d/.test(form.password)) return "La contraseña debe incluir al menos un número";
  return "";
}

function getErrorMessage(e: any, fallback: string): string {
  const err = e?.data?.error;

  if (err?.details?.length) {
    return err.details.map((d: { message: string }) => d.message).join(". ");
  }
  return err?.message ?? fallback;
}

async function submit() {
  error.value = validate();
  if (error.value) return;

  loading.value = true;
  try {
    await auth.register(form);
    if (form.role === "ADVISOR") {
      // Los tutores esperan a que un administrador apruebe su solicitud
      waitingApproval.value = true;
      return;
    }
    await navigateTo("/login?registered=student");
  } catch (e: any) {
      error.value = getErrorMessage(e, "No se puede crear la cuenta");
  } finally {
    loading.value = false;
  }
}


</script>

<template>
  <div class="grid min-h-screen lg:grid-cols-2">
    <!-- Panel -->
    <AuthBrandPanelR/>

    <!-- Formulario -->
    <main class="flex items-center justify-center p-6">
      <div class="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
        <div v-if="waitingApproval" class="text-center" role="status">
          <div class="mx-auto mb-4 grid size-14 place-items-center rounded-full bg-amber-100 text-2xl" aria-hidden="true">⏳</div>
          <h1 class="text-2xl font-bold">Solicitud enviada</h1>
          <p class="mt-3 text-sm text-slate-700">
            Tu cuenta de tutor quedó <b>pendiente de aprobación</b>. Un administrador la revisará y,
            mientras tanto, <b>no podrás iniciar sesión</b>. Vuelve a intentarlo más tarde con el correo
            <b>{{ form.email }}</b>.
          </p>
          <NuxtLink to="/login" class="mt-6 block rounded-lg bg-brand-600 px-4 py-3 font-semibold text-white hover:bg-brand-700">
            Ir a iniciar sesión
          </NuxtLink>
        </div>

        <template v-else>
        <h1 class="text-2xl font-bold">Comienza tu viaje en MentorMatch</h1>
        <p class="mt-1 text-sm text-muted">Registra una cuenta para gestionar tus asesorías.</p>

        <form class="mt-6 space-y-4" @submit.prevent="submit">
          <BaseInput v-model="form.fullName" label="Nombre Completo" placeholder="Juan Panal" type="text" required/>
          <BaseInput v-model="form.email" label="Correo Institucional" placeholder="user@ugto.mx" type="email" required />
          <div field-group>
            <BaseInput v-model="form.password" label="Contraseña" placeholder="••••••••" type="password" required />
            <p class="mt-1 text-sm text-muted"> Mínimo 8 caracteres,con una letra y un número.</p>
          </div>
          <div>
          <label class="mb-2 block text-sm font-medium text-slate-700">
            Elige tu rol
          </label>
          <div class=" grid grid-cols-2 gap-2 rounded-lg bg-slate-100 p-1 ">
            <button 
              type="button"
              class="rounded-md py-2 text-sm font-semibold transition"
              :class="form.role === 'STUDENT' ? 'bg-white text-brand-700 shadow-sm' : 'text-muted'"
              @click="form.role = 'STUDENT'"
            > 
              Alumno 
            </button>
            <button
              type="button"
              class="rounded-md py-2 text-sm font-semibold transition"
              :class="form.role === 'ADVISOR' ? 'bg-white text-brand-700 shadow-sm' : 'text-muted'"
              @click="form.role = 'ADVISOR'"
            >
               Tutor
            </button>
          </div>
          </div>
          <p v-if="error" class="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">
            {{ error }}
          </p>
          <BaseButton :loading="loading">Registrarme</BaseButton>
        </form>

        <p class="mt-6 text-center text-sm text-muted">
          ¿Ya tienes cuenta?
          <NuxtLink to="/login" class="font-semibold text-brand-600">Iniciar Sesión</NuxtLink>
        </p>
        </template>
      </div>
    </main>
  </div>
</template>
