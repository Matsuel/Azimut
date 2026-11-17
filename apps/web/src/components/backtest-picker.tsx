"use client"

import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { BACKTEST_PICKER_LIMIT } from "@/constants/pagination"
import { useBacktests } from "@/features/backtest/hook"

/** Bouton « Choisir un backtest » : menu des backtests terminés de l'utilisateur (les plus récents, D18). */
export function BacktestPicker({ onSelect }: { onSelect: (backtestId: string) => void }) {
    const t = useTranslations("components.backtestPicker")
    const { data } = useBacktests({ page: 1, pageSize: BACKTEST_PICKER_LIMIT, status: [], hasResult: true })
    const backtests = data?.data ?? []

    return (
        <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="outline" />}>{t("choose")}</DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="max-h-80 overflow-y-auto">
                {backtests.length === 0 && <DropdownMenuItem disabled>{t("empty")}</DropdownMenuItem>}
                {backtests.map((backtest) => (
                    <DropdownMenuItem key={backtest.id} onClick={() => onSelect(backtest.id)}>
                        {`${backtest.name} · ${backtest.allocations.map((a) => a.symbol).join(" / ")}`}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
