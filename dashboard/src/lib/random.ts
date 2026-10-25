// Seeded PRNG so the synthetic data looks the same on every load.
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export class Rng {
  private next: () => number

  constructor(seed: number) {
    this.next = mulberry32(seed)
  }

  float(): number {
    return this.next()
  }

  int(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min
  }

  pick<T>(items: readonly T[]): T {
    return items[Math.floor(this.next() * items.length)]
  }

  weighted<T>(items: readonly (readonly [T, number])[]): T {
    const total = items.reduce((sum, [, w]) => sum + w, 0)
    let r = this.next() * total
    for (const [item, w] of items) {
      r -= w
      if (r <= 0) return item
    }
    return items[items.length - 1][0]
  }

  hex(length: number): string {
    let out = ''
    for (let i = 0; i < length; i++) out += Math.floor(this.next() * 16).toString(16)
    return out
  }

  // Roughly normal noise via the sum of uniforms.
  noise(scale: number): number {
    return (this.next() + this.next() + this.next() - 1.5) * scale
  }
}

// FNV-1a, used for the illustrative audit hash chain. Not a security primitive.
export function shortHash(input: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(16).padStart(8, '0')
}
