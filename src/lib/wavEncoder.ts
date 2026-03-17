/**
 * Encodes a Float32Array of mono PCM samples into a WAV ArrayBuffer.
 */
export function encodeWAV(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const numChannels = 1
  const bitsPerSample = 16
  const blockAlign = numChannels * (bitsPerSample / 8)
  const byteRate = sampleRate * blockAlign
  const dataSize = samples.length * blockAlign

  const buffer = new ArrayBuffer(44 + dataSize)
  const view = new DataView(buffer)

  writeString(view, 0,  'RIFF')
  view.setUint32 (4,  36 + dataSize,  true)
  writeString(view, 8,  'WAVE')
  writeString(view, 12, 'fmt ')
  view.setUint32 (16, 16,             true)  // subchunk size
  view.setUint16 (20, 1,              true)  // PCM
  view.setUint16 (22, numChannels,    true)
  view.setUint32 (24, sampleRate,     true)
  view.setUint32 (28, byteRate,       true)
  view.setUint16 (32, blockAlign,     true)
  view.setUint16 (34, bitsPerSample,  true)
  writeString(view, 36, 'data')
  view.setUint32 (40, dataSize,       true)

  let offset = 44
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true)
    offset += 2
  }

  return buffer
}

function writeString(view: DataView, offset: number, value: string): void {
  for (let i = 0; i < value.length; i++) {
    view.setUint8(offset + i, value.charCodeAt(i))
  }
}

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}
