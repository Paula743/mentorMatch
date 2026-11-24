<script setup lang="ts">
const links = [
  { to: "/admin", label: "Resumen" },
  { to: "/admin/alumnos", label: "Alumnos" },
  { to: "/admin/profesores", label: "Profesores" },
  { to: "/admin/solicitudes", label: "Solicitudes de tutores" },
  { to: "/admin/tutorias", label: "Asesorías" },
];
</script>

<template>
  <div class="flex min-h-screen bg-gray-50">
    <SideNav :links="links" />
    <main class="flex-1 overflow-x-auto p-8"><slot /></main>
  </div>
</template>