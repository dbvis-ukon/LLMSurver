import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import * as path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    // Proxy setup for local development
    proxy: {
      "/api": {
        target:
          "http://" +
          process.env.VITE_BACKEND_HOST +
          ":" +
          process.env.VITE_BACKEND_PORT,
        changeOrigin: true,
        secure: false,
        proxyTimeout: 1000 * 60 * 5, // 5 minutes in ms
        timeout: 1000 * 60 * 5, // same as above
      },
    },
    host: "0.0.0.0",
    port: 3000,
  },
  resolve: {
    alias: {
      "@styles": path.resolve(__dirname, "src/styles"),
      "@components": path.resolve(__dirname, "src/components"),
    },
  },
  plugins: [react()],
});
