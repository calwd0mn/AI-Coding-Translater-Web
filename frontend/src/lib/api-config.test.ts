import { describe, expect, it } from 'vitest'
import { getApiUrl } from './api-config'

describe('getApiUrl', () => {
  it('keeps relative API paths when no base URL is configured', () => {
    expect(getApiUrl('/pipeline/translate-audio-stream', '')).toBe(
      '/api/pipeline/translate-audio-stream',
    )
  })

  it('uses configured API base URL for Android app builds', () => {
    expect(
      getApiUrl(
        '/pipeline/translate-audio-stream',
        'http://192.168.1.8:3001/api/',
      ),
    ).toBe('http://192.168.1.8:3001/api/pipeline/translate-audio-stream')
  })
})
