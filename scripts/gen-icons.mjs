// Generates public/icons/icon-192.png and icon-512.png
// Uses only Node.js built-ins — no extra packages needed.
import { deflateSync } from 'zlib'
import { writeFileSync, mkdirSync } from 'fs'

function crc32(buf) {
  let crc = 0xffffffff
  for (const byte of buf) {
    crc ^= byte
    for (let j = 0; j < 8; j++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function pngChunk(type, data) {
  const t = Buffer.from(type, 'ascii')
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(Buffer.concat([t, data])))
  return Buffer.concat([len, t, data, crcBuf])
}

function makePng(size, bg, fg) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8; ihdr[9] = 2 // 8-bit RGB

  // Draw a simple coffee-themed icon: bg fill + rounded square + "D" letter
  const rowBytes = 1 + size * 3
  const raw = Buffer.alloc(size * rowBytes)

  const cx = size / 2, cy = size / 2
  const r = size * 0.38

  for (let y = 0; y < size; y++) {
    raw[y * rowBytes] = 0 // filter none
    for (let x = 0; x < size; x++) {
      const dx = x - cx, dy = y - cy
      const dist = Math.sqrt(dx * dx + dy * dy)
      // Circle fill
      const [R, G, B] = dist < r ? fg : bg
      const off = y * rowBytes + 1 + x * 3
      raw[off] = R; raw[off + 1] = G; raw[off + 2] = B
    }
  }

  const compressed = deflateSync(raw, { level: 6 })

  return Buffer.concat([
    sig,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', compressed),
    pngChunk('IEND', Buffer.alloc(0)),
  ])
}

mkdirSync('public/icons', { recursive: true })

// expresso (#410505) background, warm-roast (#7a1318) circle
const bg = [0xff, 0xf5, 0xe1]   // white-pergamino
const fg = [0x7a, 0x13, 0x18]   // warm-roast

writeFileSync('public/icons/icon-192.png', makePng(192, bg, fg))
writeFileSync('public/icons/icon-512.png', makePng(512, bg, fg))

console.log('✓ public/icons/icon-192.png')
console.log('✓ public/icons/icon-512.png')
