<script setup lang="ts">
definePageMeta({ layout: "professor", middleware: "role", roles: ["ADVISOR"] });
const auth = useAuthStore();
</script>

<template>
  <h1 class="text-2xl font-bold">Hola, {{ auth.user?.full_name }}</h1>
</template>