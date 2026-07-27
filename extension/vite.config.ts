import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const currentFile = fileURLToPath(import.meta.url);
const currentDirectory = dirname(currentFile);

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: resolve(currentDirectory, "popup.html"),
        sidepanel: resolve(currentDirectory, "sidepanel.html"),
        background: resolve(
          currentDirectory,
          "src/background/index.ts"
        ),
        content: resolve(
          currentDirectory,
          "src/content/index.ts"
        )
      },
      output: {
        entryFileNames: "assets/[name].js",
        chunkFileNames: "assets/[name].js",
        assetFileNames: "assets/[name][extname]"
      }
    }
  }
});
