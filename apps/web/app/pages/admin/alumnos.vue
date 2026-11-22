<script setup lang="ts">
definePageMeta({ layout: "admin", middleware: "role", roles: ["ADMIN"] });
</script>

<template>
  <UsersCrud role="STUDENT" title="Alumnos" singular="alumno" />
</template>