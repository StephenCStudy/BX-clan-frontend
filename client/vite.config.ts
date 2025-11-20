import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    react({
      babel: {
        plugins: [["babel-plugin-react-compiler"]],
      },
    }),
  ],
  server: {
    // Proxy API requests to the backend during development so
    // requests to /api/* return backend JSON instead of Vite's index.html
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
        secure: false,
      },
    },
  },
  // Increase chunk size warning limit to reduce noisy warnings during build.
  // Value is in KB. Default is 500 (KB). Set to 2000 (2 MB) here as a sensible default
  // while you evaluate opportunities to split or reduce heavy dependencies.
  build: {
    chunkSizeWarningLimit: 2000,
    // Optional: you can add rollupOptions.manualChunks to split large vendor bundles.
    // rollupOptions: {
    //   output: {
    //     manualChunks: {
    //       react: ["react", "react-dom"],
    //     },
    //   },
    // },
  },
});
