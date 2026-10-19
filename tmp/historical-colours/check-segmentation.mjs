import fs from "node:fs";
import sharp from "sharp";
import { segmentChartChips } from "../../lib/paint/chart-segmentation.ts";
for (const id of ["1926-ford", "1930-ford", "1956-chevrolet", "1965-chevrolet", "1977-toyota"]) {
  const {data,info} = await sharp(`tmp/historical-colours/${id}.jpg`).resize({width:1000,height:1200,fit:"inside",withoutEnlargement:true}).removeAlpha().raw().toBuffer({resolveWithObject:true});
  const chips = segmentChartChips(data,info.width,info.height);
  const svg = `<svg width="${info.width}" height="${info.height}">${chips.map((c,i)=>`<rect x="${c.x}" y="${c.y}" width="${c.width}" height="${c.height}" fill="none" stroke="red" stroke-width="2"/><text x="${c.x}" y="${c.y+12}" fill="red">${i+1}</text>`).join("")}</svg>`;
  await sharp(`tmp/historical-colours/${id}.jpg`).resize({width:info.width,height:info.height}).composite([{input:Buffer.from(svg)}]).png().toFile(`tmp/historical-colours/${id}-detected.png`);
  fs.writeFileSync(`tmp/historical-colours/${id}-chips.json`,JSON.stringify({width:info.width,height:info.height,chips}));
  console.log(id, chips.length, chips.map(c=>c.hex).join(" "));
}
