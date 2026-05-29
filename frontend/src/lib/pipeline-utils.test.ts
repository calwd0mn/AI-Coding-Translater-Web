import { beforeEach, describe, expect, it, vi } from 'vitest'

const isNativePlatform = vi.fn()
const save = vi.fn()

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform,
  },
  registerPlugin: vi.fn(() => ({
    save,
  })),
}))

describe('saveTextFile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    isNativePlatform.mockReturnValue(true)
  })

  it('saves text into public downloads on native platforms', async () => {
    save.mockResolvedValue({
      fileName: 'transcript.txt',
      relativePath: 'transcript.txt',
    })

    const { saveTextFile } = await import('./pipeline-utils')

    const message = await saveTextFile('hello', 'transcript.txt')

    expect(save).toHaveBeenCalledWith({
      fileName: 'transcript.txt',
      mimeType: 'text/plain;charset=utf-8',
      base64Data: expect.any(String),
    })
    expect(message).toBe('已保存到下载目录：transcript.txt')
  })
})
