/**
 * Mulberry32 – kleiner, deterministischer PRNG.
 * Für denselben Seed entsteht dieselbe Zahlenfolge,
 * unabhängig von Plattform und Engine.
 */
export type SeededRandom = () => number;

export function mulberry32(seed: number): SeededRandom {
  let state = seed >>> 0;
  return function next(): number {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randomBetween(random: SeededRandom, min: number, max: number): number {
  return min + (max - min) * random();
}

/**
 * Stabiler 32-Bit-Hash (FNV-1a) für Seeds aus Zeichenketten,
 * z. B. checkout.id + targetDate für den Fallback-Generator.
 */
export function hashStringToSeed(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0) & 0x7fffffff;
}
