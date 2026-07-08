import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("@tiptap/")) {
            return "editor";
          }
          if (id.includes("@dnd-kit/")) {
            return "dnd";
          }
          if (
            id.includes("@tanstack/react-query") ||
            id.includes("zustand") ||
            id.includes("react-hook-form") ||
            id.includes("zod")
          ) {
            return "query";
          }
          if (
            id.includes("react-router-dom") ||
            id.includes("/react/") ||
            id.includes("/react-dom/")
          ) {
            return "react";
          }
          return undefined;
        },
      },
    },
  },
  server: {
    host: "127.0.0.1",
    port: 5173,
    proxy: {
      "/api": "http://127.0.0.1:8000",
      "/media": "http://127.0.0.1:8000",
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setupTests.ts",
  },
});
