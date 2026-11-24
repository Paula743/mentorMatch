<script setup lang="ts">
const auth = useAuthStore();

const links = [
  { to: "/profesor", label: "Inicio" },
  { to: "/profesor/disponibilidad", label: "Disponibilidad de horarios" },
  { to: "/profesor/agendadas", label: "Asesorías agendadas" },
  { to: "/profesor/pasadas", label: "Asesorías pasadas" },
];

// "Editar perfil" se habilita cuando el administrador acepta al tutor
const profile = computed(() => ({
  to: "/profesor/perfil",
  label: "Editar perfil",
  enabled: auth.user?.status === "APPROVED",
  hint: "Se habilita cuando un administrador apruebe tu cuenta.",
}));
</script>

<template>
  <div class="flex min-h-screen bg-gray-50">
    <SideNav :links="links" :profile="profile" />
    <main class="flex-1 overflow-x-auto p-8"><slot /></main>
  </div>
</template>
