import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  modules: ["@pinia/nuxt", "@nuxt/fonts", "@nuxt/icon/module"],
  css: ["~/assets/css/main.css"],
  devServer: { port: 3000 },
  runtimeConfig: {
    public: { apiBase: "http://localhost:3001" },
  },
  vite: { plugins: [tailwindcss()] },
});