import { apiFetch } from "@/lib/api"
import type { ProjectionView } from "./types"

export async function getProjection(backtestId: string): Promise<ProjectionView> {
    return apiFetch<ProjectionView>(`/projection/${backtestId}`)
}
