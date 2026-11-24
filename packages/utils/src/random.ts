/**
 * Générateur pseudo-aléatoire mulberry32 : suite déterministe de réels dans [0, 1) pour une graine entière.
 * Deux appels avec la même graine produisent la même suite.
 */
export function mulberry32(seed: number): () => number {
    let state = seed >>> 0;
    return () => {
        state = (state + 0x6d2b79f5) >>> 0;
        let t = state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/**
 * Tirages de la loi normale centrée réduite (Box-Muller) à partir d'un générateur uniforme dans [0, 1) : chaque transformation
 * produit deux valeurs, la seconde est servie au tirage suivant. Même générateur, même suite.
 */
export function standardNormal(uniform: () => number): () => number {
    let spare: number | null = null;
    return () => {
        if (spare !== null) {
            const value = spare;
            spare = null;
            return value;
        }
        // 1 − u dans ]0, 1] : le logarithme reste fini
        const radius = Math.sqrt(-2 * Math.log(1 - uniform()));
        const angle = 2 * Math.PI * uniform();
        spare = radius * Math.sin(angle);
        return radius * Math.cos(angle);
    };
}
