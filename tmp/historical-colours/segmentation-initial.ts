export interface ChipRegion { x: number; y: number; width: number; height: number; hex: string; }

function median(values: number[]) {
  values.sort((a, b) => a - b);
  return values[Math.floor(values.length / 2)] ?? 0;
}

/** Read the middle of a physical chip, leaving paper, labels and borders out. */
export function sampleChipHex(rgb: Uint8Array, width: number, region: Omit<ChipRegion, "hex">): string {
  const channels: number[][] = [[], [], []];
  const left = Math.ceil(region.x + region.width * .22);
  const top = Math.ceil(region.y + region.height * .22);
  const right = Math.floor(region.x + region.width * .78);
  const bottom = Math.floor(region.y + region.height * .78);
  for (let y = top; y < bottom; y += 2) {
    for (let x = left; x < right; x += 2) {
      const offset = (y * width + x) * 3;
      for (let c = 0; c < 3; c++) channels[c].push(rgb[offset + c]);
    }
  }
  return `#${channels.map((channel) => median(channel).toString(16).padStart(2, "0")).join("")}`;
}

/** Detect rectangular paint chips across colour charts, independently of OCR. */
export function segmentChartChips(rgb: Uint8Array, width: number, height: number): ChipRegion[] {
  const buckets = new Map<number, number>();
  for (let i = 0; i < rgb.length; i += 15) {
    const r = rgb[i], g = rgb[i + 1], b = rgb[i + 2];
    if ((r + g + b) / 3 < 150) continue;
    const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
    buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }
  const dominant = [...buckets].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 0xfff;
  const paper = [((dominant >> 8) & 15) * 16 + 8, ((dominant >> 4) & 15) * 16 + 8, (dominant & 15) * 16 + 8];
  const stride = width + 1;
  const integral = new Uint32Array(stride * (height + 1));
  for (let y = 0; y < height; y++) {
    let row = 0;
    for (let x = 0; x < width; x++) {
      const p = (y * width + x) * 3;
      const distance = Math.abs(rgb[p] - paper[0]) + Math.abs(rgb[p + 1] - paper[1]) + Math.abs(rgb[p + 2] - paper[2]);
      row += Number(distance > 48);
      integral[(y + 1) * stride + x + 1] = integral[y * stride + x + 1] + row;
    }
  }
  // Erosion breaks thin table rules and text into separate, small components.
  const radius = 2;
  const mask = new Uint8Array(width * height);
  for (let y = radius; y < height - radius; y++) {
    for (let x = radius; x < width - radius; x++) {
      const l = x - radius, r = x + radius + 1, t = y - radius, b = y + radius + 1;
      const count = integral[b * stride + r] - integral[t * stride + r] - integral[b * stride + l] + integral[t * stride + l];
      if (count >= 24) mask[y * width + x] = 1;
    }
  }
  const stack = new Int32Array(mask.length);
  const regions: ChipRegion[] = [];
  for (let start = 0; start < mask.length; start++) {
    if (!mask[start]) continue;
    let size = 0, count = 0;
    let left = width, right = 0, top = height, bottom = 0;
    stack[size++] = start;
    mask[start] = 0;
    while (size) {
      const p = stack[--size], x = p % width, y = Math.floor(p / width);
      count++;
      left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y);
      for (const n of [x > 0 ? p - 1 : -1, x < width - 1 ? p + 1 : -1, y > 0 ? p - width : -1, y < height - 1 ? p + width : -1]) {
        if (n >= 0 && mask[n]) { mask[n] = 0; stack[size++] = n; }
      }
    }
    const w = right - left + 1, h = bottom - top + 1, area = w * h;
    if (w < Math.max(25, width * .035) || h < Math.max(12, height * .012) || w / h < .65 || w / h > 9 || count / area < .83 || area > width * height * .16) continue;
    const region = { x: Math.max(0, left - radius), y: Math.max(0, top - radius), width: Math.min(width - left + radius, w + radius * 2), height: Math.min(height - top + radius, h + radius * 2) };
    regions.push({ ...region, hex: sampleChipHex(rgb, width, region) });
  }
  return regions.sort((a, b) => Math.abs(a.y - b.y) < Math.min(a.height, b.height) * .5 ? a.x - b.x : a.y - b.y);
}
