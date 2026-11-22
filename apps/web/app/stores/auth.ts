export const useAuthStore = defineStore("auth", () => {
  const config = useRuntimeConfig();
 
  const token = useCookie<string | null>("token", {
    default: () => null,
    maxAge: 60 * 60 * 24 * 7,
  });
  const user = useCookie<{ id: number; full_name: string; role: string } | null>("user", {
    default: () => null,
  });

  const isLoggedIn = computed(() => !!token.value);

  async function login(email: string, password: string) {
    const api = useApi();
    const res = await api<{ token: string; user: any }>("/api/auth/login", {
      baseURL: config.public.apiBase,
      method: "POST",
      body: { email, password },
    });

    const t = res.accessToken ?? res.token ?? res.data?.token;
    if (!t) {
      console.error("Respuesta del login:", res);
      throw new Error("La API no devolvió un token");
    }

    token.value = t;
    user.value = res.user ?? res.data?.user ?? null;
  }

  async function register(payload: { fullName: string; email: string; password: string, role: "STUDENT" | "ADVISOR" }) {
    await $fetch("/api/auth/register", {
      baseURL: config.public.apiBase,
      method: "POST",
      body: {
        full_name: payload.fullName,
        email: payload.email,
        password: payload.password,
        role: payload.role
      },
    });
  }

  function logout() {
    token.value = null;
    user.value = null;
    navigateTo("/login");
  }

  return { token, user, isLoggedIn, login, register, logout };
});