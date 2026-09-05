export const MAX_LOGO_SOURCE_BYTES = 5 * 1024 * 1024;

const LOGO_SIZE = 256;

/**
 * File → 256×256 PNG data URL, aspect-preserved CONTAIN (letterboxed,
 * transparent padding — PNG preserves alpha; JPEG would black-fill it:
 * declared deviation from PRD F1's "JPEG"). Throws Error with a
 * human-readable message on non-image type or oversize.
 */
export async function resizeLogoFile(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Logo must be an image file (PNG or JPEG).");
  }
  if (file.size > MAX_LOGO_SOURCE_BYTES) {
    throw new Error("Logo is too large — pick an image under 5 MB.");
  }

  const dataUrl = await readFileAsDataUrl(file);
  const image = await loadImage(dataUrl);

  const canvas = document.createElement("canvas");
  canvas.width = LOGO_SIZE;
  canvas.height = LOGO_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Your browser can't process images right now.");

  // CONTAIN: letterbox on the transparent 256×256 canvas, centered.
  const scale = Math.min(LOGO_SIZE / image.width, LOGO_SIZE / image.height);
  const w = image.width * scale;
  const h = image.height * scale;
  ctx.drawImage(image, (LOGO_SIZE - w) / 2, (LOGO_SIZE - h) / 2, w, h);
  return canvas.toDataURL("image/png");
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result)));
    reader.addEventListener("error", () => reject(new Error("Could not read that file.")));
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
    image.addEventListener("error", () => reject(new Error("Could not decode that image.")));
    image.src = src;
  });
}
