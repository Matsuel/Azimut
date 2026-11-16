"use client"

import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useBacktests } from "@/features/backtest/hook"
import { RISK_PICKER_LIMIT } from "./constants"

/** Bouton « Choisir un backtest » : menu des backtests terminés de l'utilisateur (les plus récents, D18). */
export function BacktestPicker({ onSelect }: { onSelect: (backtestId: string) => void }) {
    const t = useTranslations("risk")
    const { data } = useBacktests({ page: 1, pageSize: RISK_PICKER_LIMIT, status: [], hasResult: true })
    const backtests = data?.data ?? []

    return (
        <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="outline" />}>{t("choose")}</DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="max-h-80 overflow-y-auto">
                {backtests.length === 0 && <DropdownMenuItem disabled>{t("noBacktest")}</DropdownMenuItem>}
                {backtests.map((backtest) => (
                    <DropdownMenuItem key={backtest.id} onClick={() => onSelect(backtest.id)}>
                        {`${backtest.name} · ${backtest.allocations.map((a) => a.symbol).join(" / ")}`}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
