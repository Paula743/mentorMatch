interface AuthUser {
  id: number;
  full_name: string;
  email: string;
  role: "STUDENT" | "ADVISOR" | "ADMIN";
  status: "PENDING" | "APPROVED" | "REJECTED";
}

export const useAuthStore = defineStore("auth", () => { 
  const token = useCookie<string | null>("token", {
    default: () => null,
    maxAge: 60 * 60 * 24 * 7,
  });
  const user = useCookie<AuthUser | null>("user", {
    default: () => null,
    maxAge: 60 * 60 * 24 * 7,
    sameSite: "lax",
  });

  const isLoggedIn = computed(() => !!token.value);

  async function login(email: string, password: string) {
    const api = useApi();
    const res = await api<{ token: string; user: AuthUser  }>("/api/auth/login", {
      method: "POST",
      body: { email, password },
    });

    token.value = res.data.token;
    user.value = res.data.user;
  }

  async function register(payload: { fullName: string; email: string; password: string, role: "STUDENT" | "ADVISOR" }) {
    const api = useApi();
    await api("/api/auth/register", {
      method: "POST",
      body: {
        full_name: payload.fullName,
        email: payload.email,
        password: payload.password,
        role: payload.role,
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