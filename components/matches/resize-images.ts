/**
 * Browser-only screenshot prep (PRD §F2 + R10): downscale to ≤1600px longest
 * edge, JPEG q0.85, before POSTing to /api/ocr.
 *
 * shouldResize is pure and unit-tested; resizeImageFile touches DOM APIs and
 * is exercised through the upload flow instead.
 */

export const MAX_UPLOAD_EDGE = 1600;
/** Sources at or under this size AND dimension cap skip re-encode entirely. */
export const SKIP_RESIZE_BYTES = 500 * 1024;

export function shouldResize(
  width: number,
  height: number,
  bytes: number,
): boolean {
  return Math.max(width, height) > MAX_UPLOAD_EDGE || bytes > SKIP_RESIZE_BYTES;
}

/**
 * File → JPEG data URL (≤1600px longest edge, q0.85). Sources already
 * ≤1600px AND ≤500KB are returned as their own data URL with NO canvas
 * re-encode — WhatsApp-compressed shots must not be re-compressed.
 */
export async function resizeImageFile(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Screenshots must be JPEG or PNG images.");
  }
  const dataUrl = await readFileAsDataUrl(file);
  const image = await loadImage(dataUrl);
  if (!shouldResize(image.width, image.height, file.size)) return dataUrl;

  const scale = MAX_UPLOAD_EDGE / Math.max(image.width, image.height);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Your browser can't process images right now.");
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.85);
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result)));
    reader.addEventListener("error", () =>
      reject(new Error("Could not read that file.")),
    );
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => {
      if (image.width < 1 || image.height < 1) {
        reject(new Error("That image looks empty or corrupted."));
        return;
      }
      resolve(image);
    });
    image.addEventListener("error", () =>
      reject(new Error("Could not decode that image.")),
    );
    image.src = src;
  });
}
