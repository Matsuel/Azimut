import { useLocale } from "next-intl"

// Mois moyen du calendrier grégorien, pour convertir des jours calendaires en mois
const DAYS_PER_MONTH = 365.25 / 12

type NumberFormat = (options?: Intl.NumberFormatOptions) => (value: number) => string

/** Formatters de nombres sans devise ni date (ratios, pourcentages, quantités), dans la langue de `number`. */
function numberFormatters(number: NumberFormat) {
    const twoDecimals = number({ minimumFractionDigits: 2, maximumFractionDigits: 2 })
    return {
        /** Écart en points de pourcentage, 1 décimale, signé (`+4,4`). */
        formatPointChange: number({ minimumFractionDigits: 1, maximumFractionDigits: 1, signDisplay: "always" }),
        /** Nombre signé à 2 décimales, sans unité (`+1,25`). */
        formatChange: number({ minimumFractionDigits: 2, maximumFractionDigits: 2, signDisplay: "always" }),
        /** Ratio en fraction (0,342) affiché en variation signée (`+34,20 %`). */
        formatRatio: number({
            style: "percent",
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
            signDisplay: "always",
        }),
        /** Taux en fraction (0,3846) affiché sans signe, arrondi à l'unité (`38 %`). */
        formatRate: number({ style: "percent", maximumFractionDigits: 0 }),
        /** Taux en fraction affiché sans signe, jusqu'à 2 décimales (0,001 → `0,1 %` ; 0,1532 → `15,32 %`). */
        formatPercent: number({ style: "percent", maximumFractionDigits: 2 }),
        /** Taux en fraction affiché sans signe, 1 décimale (0,1324 → `13,2 %` ; −0,014 → `−1,4 %`). */
        formatPercent1: number({ style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 1 }),
        /** Taux en fraction affiché sans signe, 2 décimales fixes (0,0421 → `4,21 %` ; 0,04 → `4,00 %`). */
        formatPercent2: number({ style: "percent", minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        /** Facteur d'actualisation (ratio sans unité), 4 décimales (`0,8626`). */
        formatFactor: number({ minimumFractionDigits: 4, maximumFractionDigits: 4 }),
        /** Nombre sans unité, 1 décimale au plus (`3,6` actifs effectifs). */
        formatDecimal1: number({ maximumFractionDigits: 1 }),
        /** Corrélation de −1 à 1, sans unité, 2 décimales (`0,71`, `−0,18`). */
        formatCorrelation: twoDecimals,
        /** Ratio de Sharpe, sans unité, 2 décimales (`1,25`). */
        formatSharpe: twoDecimals,
        /** Quantité de titres, fractionnaires inclus (DCA) : jusqu'à 6 décimales. */
        formatQuantity: number({ maximumFractionDigits: 6 }),
        formatVolume: number({ notation: "compact", maximumFractionDigits: 2 }),
    }
}

function createFormatters(locale: string) {
    const number = (options?: Intl.NumberFormatOptions) => new Intl.NumberFormat(locale, options).format
    const date = (options: Intl.DateTimeFormatOptions) => {
        const format = new Intl.DateTimeFormat(locale, options)
        return (d: string | Date) => format.format(new Date(d))
    }
    const currencies = new Map<string, Intl.NumberFormat>()
    const currencyFormat = (currency: string, whole = false) => {
        const key = whole ? `${currency}:whole` : currency
        const options = whole ? { maximumFractionDigits: 0 } : {}
        const format = currencies.get(key) ?? new Intl.NumberFormat(locale, { style: "currency", currency, ...options })
        currencies.set(key, format)
        return format
    }

    const formatDay = date({ day: "2-digit", month: "2-digit", year: "numeric" })
    const formatDays = number({ style: "unit", unit: "day", unitDisplay: "long" })
    const formatYears = number({ style: "unit", unit: "year", unitDisplay: "long", maximumFractionDigits: 1 })
    const formatMonths = number({ style: "unit", unit: "month", unitDisplay: "long", maximumFractionDigits: 0 })

    const formatAxisSmall = number({ maximumFractionDigits: 2 })
    const formatAxisLarge = number({ maximumFractionDigits: 0 })
    const formatAxisMillions = number({ notation: "compact", maximumFractionDigits: 1 })

    return {
        /** Langue active (à passer à une librairie qui attend une locale ; pour formater, utilise les formatters ci-dessous). */
        locale,
        /** Formatter de dates propre à un composant : `formatDateWith({ month: "short" })(date)`. */
        formatDateWith: (options: Intl.DateTimeFormatOptions) => date(options),
        /** Année seule (`2024`), pour l'axe des fenêtres glissantes. */
        formatYear: date({ year: "numeric" }),
        /** Graduation numérique d'un axe : 2 décimales sous 10 (cours bas), entier jusqu'au million, compact au-delà (`2,6 M`) pour tenir dans la largeur de l'axe. */
        formatAxis: (v: number) => {
            if (Math.abs(v) >= 1_000_000) return formatAxisMillions(v)
            return v < 10 ? formatAxisSmall(v) : formatAxisLarge(v)
        },
        /** Montant dans la devise de la donnée : seul le format suit la langue (`1 234,50 €`, `€1,234.50`). */
        formatPrice: (v: number, currency: string) => currencyFormat(currency).format(v),
        /** Montant arrondi à l'euro, sans décimales : `formatWholePrice(15820, "EUR")` → `15 820 €`. */
        formatWholePrice: (v: number, currency: string) => currencyFormat(currency, true).format(v),
        ...numberFormatters(number),
        formatDate: date({ dateStyle: "short", timeStyle: "short" }),
        formatDay,
        formatDayRange: (start: string | Date, end: string | Date) => `${formatDay(start)} – ${formatDay(end)}`,
        formatMonthTick: date({ month: "short", year: "2-digit" }),
        formatMediumDate: date({ dateStyle: "medium" }),
        /** Durée en jours calendaires : en jours sous deux mois (« 45 jours »), sinon en mois arrondis (« 14 mois »). */
        formatDuration: (days: number) =>
            days < 2 * DAYS_PER_MONTH ? formatDays(days) : formatMonths(days / DAYS_PER_MONTH),
        /** Durée en années, 1 décimale au plus (`10,5 ans`). */
        formatYears,
        /** Symbole d'une devise ISO pour un libellé : `currencySymbol("EUR")` → « € ». */
        currencySymbol: (currency: string) =>
            currencyFormat(currency)
                .formatToParts(0)
                .find((p) => p.type === "currency")?.value ?? currency,
    }
}

export type Formatters = ReturnType<typeof createFormatters>

// Un jeu de formatters par langue : les `Intl.*Format` sont coûteux à construire
const formattersByLocale = new Map<string, Formatters>()

/**
 * Formatters de nombres, devises et dates dans la langue active (cookie `locale`). Un helper hors composant les reçoit
 * en premier argument (`formatAmount(f, v)`).
 */
export function useFormatters(): Formatters {
    const locale = useLocale()
    const formatters = formattersByLocale.get(locale) ?? createFormatters(locale)
    formattersByLocale.set(locale, formatters)
    return formatters
}
