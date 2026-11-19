import { apiFetch } from "@/lib/api"
import type { MonitoringServicesResponse } from "./types"

export async function getMonitoringServices(): Promise<MonitoringServicesResponse> {
    return apiFetch<MonitoringServicesResponse>("/admin/monitoring/services")
}
