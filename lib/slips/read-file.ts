"use client";
type Progress = (message: string) => void;
export async function readSlipFile(
  file: File,
  onProgress: Progress,
  signal: AbortSignal,
) {
  if (file.size > 10 * 1024 * 1024)
    throw Error("Choose an image or PDF smaller than 10 MB.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const sourceSha256 = [
    ...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
  ]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  let worker:
    | Awaited<ReturnType<(typeof import("tesseract.js"))["createWorker"]>>
    | undefined;
  const abort = () => {
    void worker?.terminate();
  };
  signal.addEventListener("abort", abort, { once: true });
  async function ocr(image: HTMLCanvasElement | File) {
    if (signal.aborted) throw Error("Reading cancelled.");
    if (!worker) {
      const { createWorker } = await import("tesseract.js");
      worker = await createWorker("eng", 1, {
        workerPath: "/slip-reader/ocr-worker.min.js",
        corePath: "/slip-reader",
        langPath: "/slip-reader",
        cacheMethod: "none",
        logger: (m) => {
          if (m.status === "recognizing text")
            onProgress(`Reading text ${Math.round(m.progress * 100)}%`);
        },
      });
    }
    if (signal.aborted) throw Error("Reading cancelled.");
    const { data } = await worker.recognize(image);
    return { text: data.text, confidence: data.confidence };
  }
  try {
    onProgress("Reading file on this device…");
    const isPdf = new TextDecoder().decode(bytes.slice(0, 5)) === "%PDF-";
    if (isPdf) {
      const pdfjs = await import("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerSrc = "/slip-reader/pdf.worker.min.mjs";
      const task = pdfjs.getDocument({ data: bytes, useSystemFonts: true });
      const abortPdf = () => {
        void task.destroy();
      };
      signal.addEventListener("abort", abortPdf, { once: true });
      try {
        const doc = await task.promise;
        if (doc.numPages > 5)
          throw Error("Split the PDF into files of at most 5 pages.");
        const texts: string[] = [],
          confidence: number[] = [];
        for (let n = 1; n <= doc.numPages; n++) {
          if (signal.aborted) throw Error("Reading cancelled.");
          onProgress(`Reading PDF page ${n} of ${doc.numPages}…`);
          const page = await doc.getPage(n),
            content = await page.getTextContent();
          let text = "",
            previousY: number | undefined;
          for (const item of content.items) {
            if (!("str" in item)) continue;
            const y = item.transform[5];
            if (previousY !== undefined && Math.abs(y - previousY) > 3)
              text += "\n";
            text += item.str + (item.hasEOL ? "\n" : " ");
            previousY = y;
          }
          if (text.replace(/\s/g, "").length < 40) {
            const normal = page.getViewport({ scale: 1 });
            const viewport = page.getViewport({
              scale: Math.min(2, 2000 / Math.max(normal.width, normal.height)),
            });
            const canvas = document.createElement("canvas");
            canvas.width = Math.ceil(viewport.width);
            canvas.height = Math.ceil(viewport.height);
            const ctx = canvas.getContext("2d");
            if (!ctx)
              throw Error("This browser cannot read scanned PDF pages.");
            try {
              await page.render({ canvas, canvasContext: ctx, viewport })
                .promise;
              const result = await ocr(canvas);
              text = result.text;
              confidence.push(result.confidence);
            } finally {
              canvas.width = 0;
              canvas.height = 0;
            }
          }
          texts.push(text);
          page.cleanup();
        }
        return {
          text: texts.join("\n").slice(0, 40000),
          sourceSha256,
          confidence: confidence.length
            ? confidence.reduce((a, b) => a + b, 0) / confidence.length
            : null,
        };
      } finally {
        signal.removeEventListener("abort", abortPdf);
        await task.destroy();
      }
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
      throw Error("Choose a JPG, PNG, WebP or PDF file.");
    const bitmap = await createImageBitmap(file);
    try {
      if (bitmap.width * bitmap.height > 40000000)
        throw Error("This image is too large. Resize it before reading.");
      const scale = Math.min(1, 2600 / Math.max(bitmap.width, bitmap.height)),
        canvas = document.createElement("canvas");
      canvas.width = Math.round(bitmap.width * scale);
      canvas.height = Math.round(bitmap.height * scale);
      try {
        const ctx = canvas.getContext("2d");
        if (!ctx) throw Error("Image reading is unavailable.");
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        const result = await ocr(canvas);
        return { ...result, sourceSha256 };
      } finally {
        canvas.width = 0;
        canvas.height = 0;
      }
    } finally {
      bitmap.close();
    }
  } finally {
    signal.removeEventListener("abort", abort);
    await worker?.terminate();
  }
}
