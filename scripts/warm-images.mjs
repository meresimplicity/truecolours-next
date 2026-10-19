import fs from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ts = require("typescript");

require.extensions[".ts"] = function registerTypescript(module, filename) {
  const source = fs.readFileSync(filename, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  });

  module._compile(output.outputText, filename);
};

const { catalogueProducts } = require("../data/catalogue.ts");
const { getCatalogueProductImage } = require("../data/catalogueImageResolver.ts");

loadLocalEnv([".env.local", ".env"]);

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const requestedWidth = Number(process.env.TRUECOLOURS_IMAGE_WARM_WIDTH || 700);
const requestedDelayMs = Number(process.env.TRUECOLOURS_IMAGE_WARM_DELAY_MS || 300);
const DRY_RUN = process.env.TRUECOLOURS_IMAGE_WARM_DRY_RUN === "1";
const WIDTH = Number.isFinite(requestedWidth)
  ? Math.max(64, Math.min(Math.round(requestedWidth), 1600))
  : 700;
const DELAY_MS = Number.isFinite(requestedDelayMs)
  ? Math.max(0, Math.round(requestedDelayMs))
  : 300;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function loadLocalEnv(paths) {
  for (const envPath of paths) {
    if (!fs.existsSync(envPath)) {
      continue;
    }

    const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);

    for (const line of lines) {
      const trimmed = line.trim();

      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }

      const separatorIndex = trimmed.indexOf("=");

      if (separatorIndex === -1) {
        continue;
      }

      const key = trimmed.slice(0, separatorIndex).trim();
      const rawValue = trimmed.slice(separatorIndex + 1).trim();

      if (!key || process.env[key]) {
        continue;
      }

      process.env[key] = rawValue.replace(/^['"]|['"]$/g, "");
    }
  }
}

function isRemoteImageUrl(url) {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.protocol === "https:" || parsedUrl.protocol === "http:";
  } catch {
    return false;
  }
}

function cloudinaryFetchImage(url, width = 700, mode = "normal") {
  const encodedUrl = encodeURIComponent(url);

  if (mode === "clean-product") {
    return `https://res.cloudinary.com/${CLOUD_NAME}/image/fetch/f_auto,q_auto,w_${width},e_background_removal/e_trim/c_pad,w_${width},h_${width},b_white/${encodedUrl}`;
  }

  if (mode === "clean-product-fallback") {
    return `https://res.cloudinary.com/${CLOUD_NAME}/image/fetch/f_auto,q_auto,w_${width},h_${width},c_fill,g_auto/${encodedUrl}`;
  }

  return `https://res.cloudinary.com/${CLOUD_NAME}/image/fetch/f_auto,q_auto,w_${width},c_pad,b_white/${encodedUrl}`;
}

async function warmImage(request, index, total) {
  const optimizedUrl = cloudinaryFetchImage(request.url, WIDTH, request.mode);

  try {
    const response = await fetch(optimizedUrl, {
      method: "GET",
      headers: {
        "User-Agent": "TRUECOLOURS-cache-warmer",
      },
    });

    console.log(`${index + 1}/${total} ${response.status} ${optimizedUrl}`);
  } catch (error) {
    console.error(`${index + 1}/${total} failed ${request.url}`);
    console.error(error instanceof Error ? error.message : error);
  }
}

async function main() {
  if (!CLOUD_NAME) {
    console.error("NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME is required.");
    process.exit(1);
  }

  const allImageRequests = catalogueProducts
    .map((product) => {
      const url = getCatalogueProductImage(product);

      if (!url) {
        return [];
      }

      if (product.isNewArrival) {
        return [
          { url, mode: "clean-product" },
          { url, mode: "clean-product-fallback" },
        ];
      }

      return [{ url, mode: "normal" }];
    })
    .flat();

  const remoteImageRequests = Array.from(
    new Map(
      allImageRequests
        .filter((request) => isRemoteImageUrl(request.url))
        .map((request) => [`${request.mode}:${request.url}`, request])
    ).values()
  );
  const skippedCount = allImageRequests.length - remoteImageRequests.length;

  console.log(`Warming ${remoteImageRequests.length} remote catalogue images through Cloudinary.`);

  if (skippedCount > 0) {
    console.log(`Skipping ${skippedCount} local/relative images.`);
  }

  if (DRY_RUN) {
    console.log("Dry run enabled. No image requests were sent.");
    remoteImageRequests.slice(0, 5).forEach((request, index) => {
      console.log(`${index + 1}. ${cloudinaryFetchImage(request.url, WIDTH, request.mode)}`);
    });
    return;
  }

  for (let index = 0; index < remoteImageRequests.length; index += 1) {
    await warmImage(remoteImageRequests[index], index, remoteImageRequests.length);
    await sleep(DELAY_MS);
  }

  console.log("Done warming Cloudinary image cache.");
}

main();
