<script setup lang="ts">
definePageMeta({ layout: "admin", middleware: "role", roles: ["ADMIN"] });
</script>

<template>
  <UsersCrud role="ADVISOR" title="Profesores" singular="profesor" />
</template>