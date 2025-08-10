import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  dts: true,
  clean: true,
  format: ["esm", "cjs"],
  target: "es2019",
  sourcemap: true,
  external: ["react", "react-dom"]
});