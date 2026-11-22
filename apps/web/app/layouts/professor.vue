<script setup lang="ts">
const links = [{ to: "/profesor", label: "Inicio" }];
</script>

<template>
  <div class="flex min-h-screen bg-gray-50">
    <SideNav :links="links" />
    <main class="flex-1 overflow-x-auto p-8"><slot /></main>
  </div>
</template>