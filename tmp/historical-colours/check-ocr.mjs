import {createWorker, PSM} from "tesseract.js";
import fs from "node:fs";
import sharp from "sharp";
import path from "node:path";
const worker = await createWorker("eng",1,{langPath:path.resolve("node_modules/@tesseract.js-data/eng/4.0.0"),cacheMethod:"none"});
await worker.setParameters({tessedit_pageseg_mode:PSM.SPARSE_TEXT});
for (const id of ["1926-ford","1956-chevrolet","1977-toyota"]) {
 const image = await sharp(`tmp/historical-colours/${id}.jpg`).resize({width:1600,height:2000,fit:"inside"}).png().toBuffer();
 const {data} = await worker.recognize(image, {}, {blocks:true, text:true});
 fs.writeFileSync(`tmp/historical-colours/${id}-ocr.json`,JSON.stringify(data));
 console.log(id,data.text);
}
await worker.terminate();
