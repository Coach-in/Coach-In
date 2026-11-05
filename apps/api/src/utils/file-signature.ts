const SIGNATURES: Record<string, { extension: string; bytes: number[] }> = {
  'image/png': { extension: 'png', bytes: [0x89, 0x50, 0x4e, 0x47] },
  'image/jpeg': { extension: 'jpg', bytes: [0xff, 0xd8, 0xff] },
  'application/pdf': { extension: 'pdf', bytes: [0x25, 0x50, 0x44, 0x46] },
};

export function extensionForContent(
  mimetype: string,
  buffer: Buffer,
): string | null {
  const signature = SIGNATURES[mimetype];
  if (!signature) return null;
  const matches = signature.bytes.every(
    (byte, index) => buffer[index] === byte,
  );
  return matches ? signature.extension : null;
}
