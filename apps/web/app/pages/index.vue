<script setup lang="ts">
const auth = useAuthStore();
await navigateTo(homeFor(auth.user?.role), { replace: true });
</script>

<template>
  <div />
</template>