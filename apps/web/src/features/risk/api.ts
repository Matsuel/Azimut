import { apiFetch } from "@/lib/api"
import type { RiskView } from "./types"

export async function getRisk(backtestId: string): Promise<RiskView> {
    return apiFetch<RiskView>(`/risk/${backtestId}`)
}

/** Enregistre la limite de drawdown, ratio de 0,01 à 0,99 (le formulaire convertit l'entier saisi en pourcent). */
export async function setRiskLimit(backtestId: string, maxDrawdownLimit: number): Promise<RiskView> {
    return apiFetch<RiskView>(`/risk/${backtestId}/constraint`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ maxDrawdownLimit }),
    })
}
