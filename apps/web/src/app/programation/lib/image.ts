// Client-side image downscaling so uploaded photos don't bloat the program or the PDF

export const IMAGE_MAX_SIZE = 800; // px, longest side
export const IMAGE_QUALITY = 0.7; // JPEG quality, 0-1

interface CompressOptions {
  maxSize?: number;
  quality?: number;
  // Crop to a centered square (like object-fit: cover), used for PDF thumbnails
  square?: boolean;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Could not load image: ${src.slice(0, 80)}`));
    img.src = src;
  });
}

export async function compressImage(
  src: string,
  { maxSize = IMAGE_MAX_SIZE, quality = IMAGE_QUALITY, square = false }: CompressOptions = {},
): Promise<string> {
  const img = await loadImage(src);

  let sx = 0;
  let sy = 0;
  let sw = img.naturalWidth;
  let sh = img.naturalHeight;
  if (square) {
    const side = Math.min(sw, sh);
    sx = (sw - side) / 2;
    sy = (sh - side) / 2;
    sw = sh = side;
  }

  const scale = Math.min(1, maxSize / Math.max(sw, sh));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(sw * scale);
  canvas.height = Math.round(sh * scale);

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");
  // JPEG has no alpha: paint transparent areas white instead of black
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

  return canvas.toDataURL("image/jpeg", quality);
}

export async function compressImageFile(file: File, options?: CompressOptions): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Le fichier n'est pas une image");

  const objectUrl = URL.createObjectURL(file);
  try {
    return await compressImage(objectUrl, options);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
