/**
 * Source d'une donnée expliquée par `InfoHint` (feature 09, D3). Les textes (titre, à quoi ça sert, calcul, formule,
 * unité, lecture) ne sont pas ici : ils vivent dans `messages/fr.json` et `messages/en.json`, namespace
 * `glossary.<clé>.<champ>` (feature 10, T-09).
 * `source` cite le fichier et le symbole qui calculent la donnée : relire les textes contre ce code quand le calcul change.
 */
export type GlossaryEntry = {
    source: string // `<chemin depuis la racine du dépôt> · <symbole>`
}

const ENGINE = "apps/backtest-engine/engine/backtest.engine.ts"
const ENGINE_UTILS = "apps/backtest-engine/engine/backtest.utils.ts"
const BACKTEST_SERVICE = "apps/core-backend/services/backtest.service.ts"
const MARKET_REPOSITORY = "apps/market-service/repositories/market.repository.ts"
const RISK_ENGINE = "apps/risk-engine/engine/risk.engine.ts"
const RISK_UTILS = "apps/risk-engine/engine/risk.utils.ts"
const PROJECTION_ENGINE = "apps/risk-engine/engine/projection.engine.ts"
const MONITORING_SERVICE = "apps/core-backend/services/monitoring.service.ts"

/**
 * Entrées du glossaire, une par donnée affichée ; la clé est aussi celle du dictionnaire (`glossary.<clé>`).
 * Les textes partagés (montant en euros ou en dollars, rendement pondéré dans le temps) sont écrits une fois par
 * langue dans `glossary.shared` et insérés par `InfoHint` (`{moneyUnit}`, `{marketMoneyUnit}`, `{twr}`).
 */
export const GLOSSARY = {
    // Risque d'un backtest (feature 13)
    riskVolatility: { source: `${RISK_ENGINE} · computeRisk (volatility, assets.volatility)` },
    valueAtRisk: { source: `${RISK_UTILS} · historicalVar (var95)` },
    expectedShortfall: { source: `${RISK_UTILS} · historicalVar (cvar95)` },
    concentration: { source: `${RISK_ENGINE} · computeRisk (hhi, effectiveAssets, maxWeight)` },
    correlation: { source: `${RISK_UTILS} · correlationMatrix` },
    riskContribution: { source: `${RISK_UTILS} · riskContributions` },
    // Projection Monte Carlo (feature 14)
    projectionPercentile: { source: `${PROJECTION_ENGINE} · computeProjection (points, years)` },
    projectionLossProbability: { source: `${PROJECTION_ENGINE} · computeProjection (years.lossProbability)` },
    // Résultat d'un backtest
    finalValue: { source: `${ENGINE} · simulate (finalValue)` },
    profit: { source: `${ENGINE} · simulate (profit)` },
    totalInvested: { source: `${ENGINE} · simulate (totalInvested)` },
    totalReturn: { source: `${ENGINE} · simulate (totalReturn)` },
    priceReturn: { source: `${ENGINE} · runBacktest (priceReturn)` },
    dividendTotal: { source: `${ENGINE} · simulate (dividendTotal)` },
    fxContribution: { source: `${ENGINE} · runBacktest (returnBreakdown.fx)` },
    localPriceReturn: { source: `${ENGINE} · runBacktest (returnBreakdown.price)` },
    dividendContribution: { source: `${ENGINE} · runBacktest (returnBreakdown.dividends)` },
    localReturn: { source: `${ENGINE} · runBacktest (returnBreakdown.local)` },
    dividendGain: { source: `${ENGINE} · runBacktest (dividendGain)` },
    dividendAmount: { source: "apps/backtest-engine/engine/backtest.portfolio.ts · advance (dividendEvents.amount)" },
    dividendQuantity: {
        source: "apps/backtest-engine/engine/backtest.portfolio.ts · advance (dividendEvents.quantity)",
    },
    cagr: { source: `${ENGINE_UTILS} · annualizedReturn` },
    volatility: { source: `${ENGINE_UTILS} · annualizedVolatility` },
    sharpeRatio: { source: `${ENGINE_UTILS} · sharpeRatio` },
    riskFreeRate: { source: `${ENGINE_UTILS} · RISK_FREE_RATE` },
    rollingWindow: { source: "apps/backtest-engine/engine/backtest.rolling.ts · rollingSummary" },
    medianCagr: { source: "apps/core-backend/services/backtest.service.ts · getBatch (summary.medianCagr)" },
    worstStart: { source: "apps/core-backend/services/backtest.service.ts · getBatch (summary.worstStart)" },
    worstWindow: { source: "apps/backtest-engine/engine/backtest.rolling.ts · rollingSummary (worst)" },
    negativeWindows: { source: "apps/backtest-engine/engine/backtest.rolling.ts · rollingSummary (negativeShare)" },
    maxDrawdown: { source: `${ENGINE_UTILS} · createDrawdownTracker` },
    recovery: { source: `${ENGINE_UTILS} · createDrawdownTracker (recoveryDays)` },
    equityCurve: { source: `${ENGINE} · simulate (equityCurve)` },
    drawdownCurve: { source: `${ENGINE_UTILS} · createDrawdownTracker (record)` },
    benchmark: { source: `${ENGINE} · runBacktest (benchmark)` },
    lumpSum: { source: `${ENGINE} · runBacktest (lumpSumComparison, dcaAdvantage)` },
    totalFees: { source: `${ENGINE} · simulate (totalFees)` },
    totalTrades: { source: `${ENGINE} · simulate (trades)` },
    rebalanceCount: { source: `${ENGINE} · simulate (rebalanceCount)` },
    holdingQuantity: { source: `${ENGINE} · simulate (holdings)` },
    holdingValue: { source: `${ENGINE} · simulate (holdings)` },
    tradeSide: { source: `${ENGINE} · simulate (trades)` },
    tradePrice: { source: `${ENGINE} · simulate (trades)` },
    tradeQuantity: { source: `${ENGINE} · simulate (trades)` },
    tradeAmount: { source: `${ENGINE} · simulate (trades)` },
    tradeFee: { source: `${ENGINE} · simulate (trades)` },

    // Hypothèses
    executionRule: { source: `${ENGINE} · runBacktest (executionRule)` },
    dataSource: { source: "packages/contracts/src/backtest.ts · PRICE_DATA_SOURCE" },
    dataFingerprint: { source: `${ENGINE_UTILS} · fingerprintPrices` },

    // Récapitulatif du formulaire « Nouveau backtest »
    plannedContributions: { source: `${BACKTEST_SERVICE} · preview (contributionCount)` },
    plannedRebalances: { source: `${BACKTEST_SERVICE} · preview (rebalanceCount)` },

    // Liste des backtests
    completedRate: { source: `${BACKTEST_SERVICE} · getStats (completedRate)` },
    failedRate: { source: `${BACKTEST_SERVICE} · getStats (failedRate)` },
    executionDuration: {
        source: "apps/web/src/features/backtest/utils.tsx · getExecutionDuration (durée entre deux timestamps de l’API)",
    },

    // Comparaison
    comparisonDelta: { source: `${BACKTEST_SERVICE} · compare (deltas)` },

    // Paramètres d'un backtest
    investmentMode: { source: `${ENGINE} · simulate (initialAmount, recurringAmount)` },
    allocation: { source: `${ENGINE} · simulate (allocations)` },
    feeRate: { source: `${ENGINE} · simulate (feeRate)` },
    rebalanceFrequency: { source: `${ENGINE} · simulate (rebalanceFrequency)` },

    // Marché
    price: { source: `${MARKET_REPOSITORY} · getAssets (regularMarketPrice)` },
    change24h: { source: `${MARKET_REPOSITORY} · getAssets (regularMarketChangePercent)` },
    volume24h: { source: `${MARKET_REPOSITORY} · getAssets (regularMarketVolume)` },
    trend: { source: `${MARKET_REPOSITORY} · getAssets (history)` },
    priceChart: { source: `${MARKET_REPOSITORY} · getDetails` },

    // Monitoring (feature 16)
    serviceState: { source: `${MONITORING_SERVICE} · MonitoringService.toStatus, down (state), getServices (summary)` },
    probeLatency: { source: `${MONITORING_SERVICE} · MonitoringService.probe (latencyMs)` },
} satisfies Record<string, GlossaryEntry>

export type GlossaryKey = keyof typeof GLOSSARY
