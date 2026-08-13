import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: process.env.GITHUB_PAGES === "true" && process.env.GITHUB_PAGES_CUSTOM_DOMAIN !== "true" ? "/najdikurty/" : "/",
  build: {
    cssCodeSplit: false,
    modulePreload: {
      polyfill: false
    },
    target: ["es2022", "chrome109", "edge109", "firefox102", "safari16"]
  },
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://127.0.0.1:4000"
    }
  }
});
