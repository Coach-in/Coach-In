import { extensionForContent } from './file-signature';

describe('extensionForContent', () => {
  it('recognises a PNG', () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]);
    expect(extensionForContent('image/png', png)).toBe('png');
  });

  it('recognises a JPEG', () => {
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
    expect(extensionForContent('image/jpeg', jpeg)).toBe('jpg');
  });

  it('recognises a PDF', () => {
    expect(
      extensionForContent('application/pdf', Buffer.from('%PDF-1.7')),
    ).toBe('pdf');
  });

  it('rejects content that does not match the declared type', () => {
    expect(
      extensionForContent('application/pdf', Buffer.from('MZ executable')),
    ).toBeNull();
  });

  it('rejects an unsupported declared type', () => {
    expect(extensionForContent('text/html', Buffer.from('<html>'))).toBeNull();
  });

  it('rejects an empty file', () => {
    expect(extensionForContent('image/png', Buffer.alloc(0))).toBeNull();
  });
});
