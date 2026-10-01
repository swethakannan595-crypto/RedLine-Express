import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  // /api/* -> FastAPI, so the frontend never hardcodes the backend URL
  server: { proxy: { "/api": "http://localhost:8000" } },
});
