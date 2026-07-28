import sharp from "sharp";
import { ZipArchive } from "archiver";
import { Writable } from "stream";

export const IOS_SIZES: { idiom: string; scale: number; size: number }[] = [
  { idiom: "iphone", scale: 2, size: 40 },
  { idiom: "iphone", scale: 3, size: 60 },
  { idiom: "iphone", scale: 2, size: 58 },
  { idiom: "iphone", scale: 3, size: 87 },
  { idiom: "iphone", scale: 2, size: 80 },
  { idiom: "iphone", scale: 3, size: 120 },
  { idiom: "iphone", scale: 2, size: 120 },
  { idiom: "iphone", scale: 3, size: 180 },
  { idiom: "ipad", scale: 1, size: 20 },
  { idiom: "ipad", scale: 2, size: 40 },
  { idiom: "ipad", scale: 1, size: 29 },
  { idiom: "ipad", scale: 2, size: 58 },
  { idiom: "ipad", scale: 1, size: 40 },
  { idiom: "ipad", scale: 2, size: 80 },
  { idiom: "ipad", scale: 1, size: 76 },
  { idiom: "ipad", scale: 2, size: 152 },
  { idiom: "ipad", scale: 2, size: 167 },
  { idiom: "ios-marketing", scale: 1, size: 1024 },
];

export const ANDROID_SIZES: { density: string; size: number }[] = [
  { density: "mdpi", size: 48 },
  { density: "hdpi", size: 72 },
  { density: "xhdpi", size: 96 },
  { density: "xxhdpi", size: 144 },
  { density: "xxxhdpi", size: 192 },
  { density: "playstore", size: 512 },
];

export interface IconLayer {
  type: string;
  rasterData?: string | null;
}

function generateContentsJson(): string {
  const images = IOS_SIZES.map((s) => ({
    size: `${s.size / s.scale}x${s.size / s.scale}`,
    idiom: s.idiom,
    filename: `icon-${s.idiom}-${s.size}x${s.size}.png`,
    scale: `${s.scale}x`,
  }));
  return JSON.stringify({ images, info: { author: "appiconmock", version: 1 } }, null, 2);
}

export async function compositeLayers(layers: IconLayer[], canvasSize: number): Promise<Buffer> {
  let base = sharp({
    create: {
      width: canvasSize,
      height: canvasSize,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  });

  const composites: { input: Buffer | string; top?: number; left?: number }[] = [];
  for (const layer of layers) {
    if (layer.type === "shape" || layer.type === "text" || layer.type === "icon") {
      if (layer.rasterData) {
        composites.push({
          input: Buffer.from(layer.rasterData, "base64"),
          top: 0,
          left: 0,
        });
      }
    }
  }

  if (composites.length > 0) {
    base = base.composite(composites);
  }

  return base.png().toBuffer();
}

export async function generateIconZIP(
  outputStream: Writable,
  compositeBuffer: Buffer,
  exportType: "ios" | "android" | "all" | "custom",
  customSizes?: number[]
): Promise<void> {
  const archive = new ZipArchive({ zlib: { level: 9 } });
  archive.pipe(outputStream);

  if (exportType === "ios" || exportType === "all") {
    for (const s of IOS_SIZES) {
      const buf = await sharp(compositeBuffer)
        .resize(s.size, s.size, {
          fit: "contain",
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .png()
        .toBuffer();
      archive.append(buf, {
        name: `ios/AppIcon.appiconset/icon-${s.idiom}-${s.size}x${s.size}.png`,
      });
    }
    archive.append(generateContentsJson(), {
      name: "ios/AppIcon.appiconset/Contents.json",
    });
  }

  if (exportType === "android" || exportType === "all") {
    for (const s of ANDROID_SIZES) {
      const buf = await sharp(compositeBuffer)
        .resize(s.size, s.size, {
          fit: "contain",
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .png()
        .toBuffer();
      const folder = s.density === "playstore" ? "playstore" : `android/mipmap-${s.density}`;
      archive.append(buf, { name: `${folder}/ic_launcher.png` });
    }

    const fgBuf = await sharp(compositeBuffer)
      .resize(432, 432, {
        fit: "contain",
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toBuffer();
    archive.append(fgBuf, { name: "android/ic_launcher_foreground.png" });

    const bgBuf = await sharp({
      create: {
        width: 432,
        height: 432,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      },
    })
      .png()
      .toBuffer();
    archive.append(bgBuf, { name: "android/ic_launcher_background.png" });
  }

  if (exportType === "custom" && customSizes) {
    for (const size of customSizes) {
      const buf = await sharp(compositeBuffer)
        .resize(size, size, {
          fit: "contain",
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .png()
        .toBuffer();
      archive.append(buf, { name: `custom/${size}x${size}.png` });
    }
  }

  await archive.finalize();
}
