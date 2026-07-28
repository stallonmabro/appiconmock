import sharp from "sharp";
import path from "path";
import fs from "fs/promises";

interface FrameConfig {
  frameImage: string;
  screenMask: { x: number; y: number; width: number; height: number };
  frameSize: { width: number; height: number };
}

export async function renderMockupExport(
  screenshotBuffer: Buffer,
  frame: FrameConfig,
  outputPath: string,
  scale: number = 1
) {
  const framePath = path.join(process.cwd(), "public", "frames", frame.frameImage);
  const frameBuf = await fs.readFile(framePath);

  const targetW = Math.round(frame.frameSize.width * scale);
  const targetH = Math.round(frame.frameSize.height * scale);

  const resizedScreenshot = await sharp(screenshotBuffer)
    .resize(
      Math.round(frame.screenMask.width * scale),
      Math.round(frame.screenMask.height * scale),
      { fit: "fill" }
    )
    .png()
    .toBuffer();

  const resizedFrame = await sharp(frameBuf)
    .resize(targetW, targetH)
    .png()
    .toBuffer();

  const result = await sharp(resizedFrame)
    .composite([
      {
        input: resizedScreenshot,
        top: Math.round(frame.screenMask.y * scale),
        left: Math.round(frame.screenMask.x * scale),
      },
    ])
    .png()
    .toFile(outputPath);

  return result;
}
