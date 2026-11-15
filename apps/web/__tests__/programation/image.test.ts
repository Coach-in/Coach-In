import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import {
  compressImage,
  compressImageFile,
  dataUrlToBlob,
  IMAGE_MAX_SIZE,
  IMAGE_QUALITY,
} from '../../src/app/programation/lib/image'

// jsdom decodes no images and has no canvas: fake both
let natural = { w: 1600, h: 800 }
let ctx: { fillStyle: string; fillRect: ReturnType<typeof vi.fn>; drawImage: ReturnType<typeof vi.fn> } | null
let canvas: { width: number; height: number; getContext: () => unknown; toDataURL: ReturnType<typeof vi.fn> }
let imageShouldFail = false

beforeEach(() => {
  natural = { w: 1600, h: 800 }
  imageShouldFail = false
  ctx = { fillStyle: '', fillRect: vi.fn(), drawImage: vi.fn() }
  canvas = { width: 0, height: 0, getContext: () => ctx, toDataURL: vi.fn(() => 'data:image/jpeg;base64,OUT') }

  vi.stubGlobal(
    'Image',
    class {
      onload: () => void = () => {}
      onerror: () => void = () => {}
      get naturalWidth() {
        return natural.w
      }
      get naturalHeight() {
        return natural.h
      }
      set src(_: string) {
        queueMicrotask(() => (imageShouldFail ? this.onerror() : this.onload()))
      }
    },
  )
  const realCreate = document.createElement.bind(document)
  vi.spyOn(document, 'createElement').mockImplementation((tag: string, o?: ElementCreationOptions) =>
    tag === 'canvas' ? (canvas as unknown as HTMLElement) : realCreate(tag, o),
  )
  URL.createObjectURL = vi.fn(() => 'blob:local')
  URL.revokeObjectURL = vi.fn()
})

afterEach(() => vi.unstubAllGlobals())

describe('compressImage', () => {
  test('downscales the longest side to the default maximum', async () => {
    await compressImage('/img.jpg')
    expect(canvas.width).toBe(IMAGE_MAX_SIZE)
    expect(canvas.height).toBe(IMAGE_MAX_SIZE / 2)
  })

  test('never upscales a small image', async () => {
    natural = { w: 200, h: 100 }
    await compressImage('/img.jpg')
    expect([canvas.width, canvas.height]).toEqual([200, 100])
  })

  test('honours custom maxSize and quality', async () => {
    await compressImage('/img.jpg', { maxSize: 400, quality: 0.5 })
    expect(canvas.width).toBe(400)
    expect(canvas.toDataURL).toHaveBeenCalledWith('image/jpeg', 0.5)
  })

  test('uses the default JPEG quality', async () => {
    await compressImage('/img.jpg')
    expect(canvas.toDataURL).toHaveBeenCalledWith('image/jpeg', IMAGE_QUALITY)
  })

  test('square mode crops the centre of the image', async () => {
    natural = { w: 1000, h: 600 }
    await compressImage('/img.jpg', { square: true, maxSize: 300 })
    expect([canvas.width, canvas.height]).toEqual([300, 300])
    // side = 600, horizontal offset = (1000 - 600) / 2
    expect(ctx!.drawImage).toHaveBeenCalledWith(expect.anything(), 200, 0, 600, 600, 0, 0, 300, 300)
  })

  test('paints a white background before drawing (JPEG has no alpha)', async () => {
    await compressImage('/img.jpg')
    expect(ctx!.fillStyle).toBe('#ffffff')
    expect(ctx!.fillRect).toHaveBeenCalledWith(0, 0, canvas.width, canvas.height)
  })

  test('returns the canvas data URL', async () => {
    expect(await compressImage('/img.jpg')).toBe('data:image/jpeg;base64,OUT')
  })

  test('rejects when the image cannot be decoded', async () => {
    imageShouldFail = true
    await expect(compressImage('/broken.jpg')).rejects.toThrow('Could not load image')
  })

  test('rejects when there is no 2D context', async () => {
    ctx = null
    await expect(compressImage('/img.jpg')).rejects.toThrow('Canvas 2D context unavailable')
  })

  test('fetches cross-origin images as a blob to avoid tainting the canvas', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, blob: async () => new Blob(['x']) } as Response)
    await compressImage('http://minio.test/exercise.jpg')
    expect(fetchMock).toHaveBeenCalledWith('http://minio.test/exercise.jpg', { cache: 'no-store' })
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:local')
  })

  test('does not fetch same-origin or relative images', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
    await compressImage('/exercises/squat.jpg')
    await compressImage(`${window.location.origin}/x.jpg`)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  test('rejects when a cross-origin fetch fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: false, status: 403 } as Response)
    await expect(compressImage('http://minio.test/x.jpg')).rejects.toThrow('Could not fetch image: 403')
  })
})

describe('compressImageFile', () => {
  test('rejects non-image files', async () => {
    await expect(compressImageFile(new File(['x'], 'a.pdf', { type: 'application/pdf' }))).rejects.toThrow(
      "Le fichier n'est pas une image",
    )
  })

  test('compresses images and always releases the object URL', async () => {
    const out = await compressImageFile(new File(['x'], 'a.png', { type: 'image/png' }))
    expect(out).toBe('data:image/jpeg;base64,OUT')
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:local')
  })

  test('releases the object URL even when compression fails', async () => {
    imageShouldFail = true
    await expect(compressImageFile(new File(['x'], 'a.png', { type: 'image/png' }))).rejects.toThrow()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:local')
  })
})

describe('dataUrlToBlob', () => {
  test('resolves the blob fetched from the data URL', async () => {
    const blob = new Blob(['x'], { type: 'image/jpeg' })
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({ blob: async () => blob } as Response)
    expect(await dataUrlToBlob('data:image/jpeg;base64,AAA')).toBe(blob)
  })
})
