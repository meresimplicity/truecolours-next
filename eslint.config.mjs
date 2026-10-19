import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTypeScript,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "output/**",
    "tmp/**",
    // These upstream/reference source trees are not part of the Next.js app.
    "operating system/**",
    "open-vehicle-db-master/**",
    "vehicle-db-main/**",
    // A separate legacy starter and vendored OCR runtime are not app source.
    "truecolours/**",
    "public/slip-reader/**",
    "next-env.d.ts",
    "scripts/**",
    "tests/**",
  ]),
]);
