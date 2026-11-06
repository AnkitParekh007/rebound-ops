import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const { chromium } = createRequire('/Users/ankitparekh/Desktop/Projects/rebound-ops/rebound-ops/package.json')('playwright');
mkdirSync('out', { recursive: true });
const b = await chromium.launch(); const p = await b.newPage();
const src = (f) => 'data:image/png;base64,' + readFileSync(f).toString('base64');
// job: {file, crop:[x0,y0,x1,y1], pad, size:[w,h] | null(longest side), square, unmatte:bool, bg: css color or null, out}
const jobs = [
  { file: 'src-dark.png',  crop: [207,209,644,553], pad: 0.06, square: true, unmatte: true, side: 256, out: 'reboundops-mark.png' },
  { file: 'src-dark.png',  crop: [207,209,644,553], pad: 0.04, square: true, unmatte: true, side: 64,  out: 'favicon-64.png' },
  { file: 'src-dark.png',  crop: [207,209,644,553], pad: 0.02, square: true, unmatte: true, side: 32,  out: 'favicon-32.png' },
  { file: 'src-dark.png',  crop: [207,209,644,553], pad: 0.18, square: true, unmatte: false, side: 180, out: 'apple-touch-icon.png' },
  { file: 'src-dark.png',  crop: [88,207,804,689], pad: 0.04, square: false, unmatte: true, side: 560, out: 'reboundops-logo-on-dark.png' },
  { file: 'src-light.png', crop: [89,208,798,689], pad: 0.04, square: false, unmatte: true, side: 560, out: 'reboundops-logo-on-light.png' },
];
for (const j of jobs) {
  const b64 = await p.evaluate(async ({ url, j }) => {
    const img = new Image(); img.src = url; await img.decode();
    const full = new OffscreenCanvas(img.width, img.height); const fx = full.getContext('2d'); fx.drawImage(img, 0, 0);
    const bgd = fx.getImageData(5, 5, 1, 1).data; const B = [bgd[0], bgd[1], bgd[2]];
    let [x0, y0, x1, y1] = j.crop; let w = x1 - x0 + 1, h = y1 - y0 + 1;
    const px = Math.round(Math.max(w, h) * j.pad);
    const fw = j.square ? Math.max(w, h) + 2 * px : w + 2 * px, fh = j.square ? Math.max(w, h) + 2 * px : h + 2 * px;
    const scale = j.side / Math.max(fw, fh);
    const ow = Math.round(fw * scale), oh = Math.round(fh * scale);
    // crop at full resolution, unmatte, then downscale (so resampling sees alpha, not the bg colour)
    const crop = new OffscreenCanvas(w + 6, h + 6); const cx = crop.getContext('2d');
    cx.drawImage(full, -(x0 - 3), -(y0 - 3));
    if (j.unmatte) {
      const id = cx.getImageData(0, 0, crop.width, crop.height); const d = id.data;
      for (let k = 0; k < d.length; k += 4) {
        let a = 0;
        for (let c = 0; c < 3; c++) {
          const v = d[k + c], bc = B[c];
          const ac = v > bc ? (v - bc) / (255 - bc) : v < bc ? (bc - v) / bc : 0;
          if (ac > a) a = ac;
        }
        const LO = 0.22, HI = 0.40;
        if (a <= LO) { d[k + 3] = 0; continue; }
        for (let c = 0; c < 3; c++) d[k + c] = Math.max(0, Math.min(255, Math.round(B[c] + (d[k + c] - B[c]) / a)));
        d[k + 3] = Math.round(255 * Math.min(1, a >= HI ? a : (a - LO) / (HI - LO) * HI));
      }
      cx.putImageData(id, 0, 0);
    }
    const out = new OffscreenCanvas(ow, oh); const ox = out.getContext('2d');
    if (!j.unmatte) { ox.fillStyle = `rgb(${B})`; ox.fillRect(0, 0, ow, oh); }
    ox.imageSmoothingQuality = 'high';
    const dw = (w + 6) * scale, dh = (h + 6) * scale;
    ox.drawImage(crop, (ow - dw) / 2, (oh - dh) / 2, dw, dh);
    const blob = await out.convertToBlob({ type: 'image/png' });
    const buf = new Uint8Array(await blob.arrayBuffer()); let s = ''; for (const x of buf) s += String.fromCharCode(x);
    return btoa(s);
  }, { url: src(j.file), j });
  writeFileSync('out/' + j.out, Buffer.from(b64, 'base64'));
  console.log(j.out);
}
await b.close();
