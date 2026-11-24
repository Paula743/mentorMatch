export default defineNuxtRouteMiddleware((to) => {
  const auth = useAuthStore();
  if (!auth.isLoggedIn) return navigateTo("/login");

  const allowed = (to.meta.roles as string[] | undefined) ?? [];
  if (allowed.length && !allowed.includes(auth.user?.role ?? "")) {
    return navigateTo(homeFor(auth.user?.role));
  }
});