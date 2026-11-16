/**
 * Générateur pseudo-aléatoire mulberry32 : suite déterministe de réels dans [0, 1) pour une graine entière.
 * Deux appels avec la même graine produisent la même suite.
 */
export function mulberry32(seed: number): () => number {
    let state = seed >>> 0
    return () => {
        state = (state + 0x6d2b79f5) >>> 0
        let t = state
        t = Math.imul(t ^ (t >>> 15), t | 1)
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
}

/**
 * Percentile `p` (0..1) d'un tableau déjà trié par ordre croissant, par interpolation linéaire à l'indice `p × (n − 1)`.
 * `sorted` non vide.
 */
export function percentile(sorted: Float64Array, p: number): number {
    const index = p * (sorted.length - 1)
    const low = Math.floor(index)
    const high = Math.ceil(index)
    return sorted[low]! + (sorted[high]! - sorted[low]!) * (index - low)
}
