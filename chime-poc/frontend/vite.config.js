import { resolve } from "path";

export default {
  build: {
    outDir: "../static",
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(__dirname, "src/main.js"),
      output: {
        entryFileNames: "app.js",
        format: "es",
      },
    },
  },
};