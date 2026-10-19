/** Self-host the upstream OCR/PDF workers. No receipt goes to an external OCR service. */
import { mkdir, copyFile, readdir } from "node:fs/promises";
import path from "node:path";
const dest = "public/slip-reader";
await mkdir(dest, { recursive: true });
for (const name of await readdir("node_modules/tesseract.js-core")) {
  if (name.endsWith(".wasm.js"))
    await copyFile(
      path.join("node_modules/tesseract.js-core", name),
      path.join(dest, name),
    );
}
for (const [from, to] of [
  ["node_modules/tesseract.js/dist/worker.min.js", "ocr-worker.min.js"],
  [
    "node_modules/tesseract.js/dist/worker.min.js.LICENSE.txt",
    "ocr-worker.LICENSE.txt",
  ],
  [
    "node_modules/@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz",
    "eng.traineddata.gz",
  ],
  ["node_modules/pdfjs-dist/build/pdf.worker.min.mjs", "pdf.worker.min.mjs"],
  ["node_modules/tesseract.js/LICENSE.md", "TESSERACT-LICENSE"],
  ["node_modules/tesseract.js-core/LICENSE", "TESSERACT-CORE-LICENSE"],
  ["node_modules/pdfjs-dist/LICENSE", "PDFJS-LICENSE"],
  ["node_modules/fuse.js/LICENSE", "FUSE-LICENSE"],
])
  await copyFile(from, path.join(dest, to));
console.log("Prepared self-hosted Tesseract.js and PDF.js workers.");
