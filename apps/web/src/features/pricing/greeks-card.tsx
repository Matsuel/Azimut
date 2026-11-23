"use client"

import { useTranslations } from "next-intl"
import { useState } from "react"
import { InfoHint } from "@/components/info-hint"
import { OptionSelect } from "@/components/option-select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useFormatters } from "@/lib/format"
import { OPTION_DEFAULT_CURRENCY } from "./constants"
import type { ChainRow, OptionChainResult, OptionGreeks } from "./types"

const GREEKS = ["delta", "gamma", "vega", "theta", "rho"] as const
const GLOSSARY_ENTRIES = {
    delta: "greekDelta",
    gamma: "greekGamma",
    vega: "greekVega",
    theta: "greekTheta",
    rho: "greekRho",
} as const

const keyOf = (row: ChainRow) => `${row.side}-${row.strike}`

/** Contrat retenu le plus proche du spot, proposé au départ : la ligne à la monnaie. */
function nearestToSpot(rows: ChainRow[], spot: number) {
    return rows.reduce<ChainRow | undefined>(
        (best, row) => (!best || Math.abs(row.strike - spot) < Math.abs(best.strike - spot) ? row : best),
        undefined,
    )
}

/**
 * Carte « Grecques » (maquette 37) : un contrat retenu de l'échéance détaillée à choisir, sa volatilité implicite et ses cinq grecques
 * (valeur, unité, lecture) telles que calculées par le moteur.
 */
export function GreeksCard({ chain }: { chain: OptionChainResult }) {
    const f = useFormatters()
    const t = useTranslations("pages.optionChain.greeks")
    const kept = chain.chain.filter((row) => row.greeks !== null)
    const [selected, setSelected] = useState(() =>
        nearestToSpot(kept, chain.spot) ? keyOf(nearestToSpot(kept, chain.spot)!) : "",
    )
    const row = kept.find((candidate) => keyOf(candidate) === selected)
    const options = kept.map((candidate) => ({
        value: keyOf(candidate),
        label: t("contract", {
            side: t(candidate.side),
            strike: candidate.strike,
            expiration: f.formatDay(chain.chainExpiration),
        }),
    }))
    const money = (value: number) => f.formatPrice(Math.abs(value), OPTION_DEFAULT_CURRENCY)
    const readings = (greeks: OptionGreeks) => ({
        delta: t("reading.delta", { symbol: chain.symbol, change: f.formatChange(greeks.delta) }),
        gamma: t("reading.gamma", { value: f.formatDecimal3(greeks.gamma) }),
        vega: t("reading.vega", { change: f.formatChange(greeks.vega) }),
        theta: t(greeks.theta < 0 ? "reading.thetaLoss" : "reading.thetaGain", { value: money(greeks.theta) }),
        rho: t("reading.rho", { change: f.formatChange(greeks.rho) }),
    })

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t("title")}</CardTitle>
                <CardDescription>{t("subtitle")}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
                <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="greeks-contract">{t("contractLabel")}</Label>
                        <OptionSelect id="greeks-contract" value={selected} options={options} onChange={setSelected} />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="greeks-iv">
                            <InfoHint entry="impliedVolatility">{t("impliedVolatility")}</InfoHint>
                        </Label>
                        <Input
                            id="greeks-iv"
                            readOnly
                            value={row?.impliedVolatility == null ? "" : f.formatPercent1(row.impliedVolatility)}
                        />
                    </div>
                </div>
                {row?.greeks && (
                    <Table>
                        <TableHeader>
                            <TableRow variant="static">
                                <TableHead variant="caption">{t("greek")}</TableHead>
                                <TableHead variant="caption" className="text-right">
                                    {t("value")}
                                </TableHead>
                                <TableHead variant="caption">{t("unit")}</TableHead>
                                <TableHead variant="caption">{t("readingTitle")}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {GREEKS.map((greek) => (
                                <TableRow key={greek} variant="static" className="h-11">
                                    <TableCell className="text-body-semibold">
                                        <InfoHint entry={GLOSSARY_ENTRIES[greek]}>{t(`names.${greek}`)}</InfoHint>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {greek === "gamma"
                                            ? f.formatDecimal3(row.greeks![greek])
                                            : f.formatChange(row.greeks![greek])}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">{t(`units.${greek}`)}</TableCell>
                                    <TableCell>{readings(row.greeks!)[greek]}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
                <p className="text-small text-muted-foreground">{t("note")}</p>
            </CardContent>
        </Card>
    )
}
