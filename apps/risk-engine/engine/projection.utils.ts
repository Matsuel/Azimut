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
