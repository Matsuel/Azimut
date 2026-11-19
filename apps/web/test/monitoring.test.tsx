import { afterEach, expect, test } from "bun:test"
import { cleanup, render, screen } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"
import type { ReactNode } from "react"
import fr from "../messages/fr.json"
import { ServiceCard } from "../src/features/monitoring/service-card"
import { MonitoringStats } from "../src/features/monitoring/stats"
import type { MonitoringServicesResponse, ServiceStatus } from "../src/features/monitoring/types"

afterEach(cleanup)

const inFrench = (node: ReactNode) =>
    render(
        <NextIntlClientProvider locale="fr" messages={fr}>
            {node}
        </NextIntlClientProvider>,
    )

// Espaces insécables d'Intl (« 12 ms », « il y a 3 s »)
const normalize = (value: string) => value.replace(/\s/g, " ")
const text = (value: string) => screen.getByText((content) => normalize(content) === value)

const checkedAt = "2026-11-19T10:00:00.000Z"
const now = new Date("2026-11-19T10:00:03.000Z")

test("service up : badge Opérationnel, dépendances OK, latence et ancienneté du contrôle", () => {
    const status: ServiceStatus = {
        service: "core-backend",
        state: "up",
        checks: { database: "ok", kafka: "ok" },
        latencyMs: 12,
        checkedAt,
    }
    inFrench(<ServiceCard status={status} now={now} />)

    expect(screen.getByText("core-backend")).toBeTruthy()
    expect(screen.getByText("Opérationnel")).toBeTruthy()
    expect(screen.getByText("Base")).toBeTruthy()
    expect(screen.getByText("Kafka")).toBeTruthy()
    expect(screen.getAllByText("OK")).toHaveLength(2)
    expect(text("12 ms")).toBeTruthy()
    expect(text("Vérifié il y a 3 s")).toBeTruthy()
})

test("service degraded : badge Dégradé et ligne « En panne » en destructive", () => {
    const status: ServiceStatus = {
        service: "notification-service",
        state: "degraded",
        checks: { database: "ok", kafka: "down" },
        latencyMs: 15,
        checkedAt,
    }
    inFrench(<ServiceCard status={status} now={now} />)

    expect(screen.getByText("Dégradé")).toBeTruthy()
    expect(screen.getByText("En panne").className).toContain("text-destructive")
    expect(screen.getByText("OK").className).not.toContain("text-destructive")
})

test("service down : « Sonde /readiness · Sans réponse » et latence absente", () => {
    const status: ServiceStatus = { service: "risk-engine", state: "down", latencyMs: null, checkedAt }
    inFrench(<ServiceCard status={status} now={now} />)

    expect(screen.getByText("Hors ligne")).toBeTruthy()
    expect(screen.getByText("Sonde /readiness")).toBeTruthy()
    expect(screen.getByText("Sans réponse").className).toContain("text-destructive")
    expect(screen.getByText("—")).toBeTruthy()
})

test("cartes de synthèse : valeurs reçues de summary, sans recompter", () => {
    const summary: MonitoringServicesResponse["summary"] = {
        total: 5,
        up: 3,
        degraded: 1,
        down: 1,
        downServices: ["risk-engine"],
    }
    inFrench(<MonitoringStats summary={summary} interval="15 s" />)

    expect(screen.getByText("3 / 5")).toBeTruthy()
    expect(screen.getAllByText("1")).toHaveLength(2)
    expect(screen.getByText("risk-engine")).toBeTruthy()
    expect(screen.getByText("15 s")).toBeTruthy()
})
