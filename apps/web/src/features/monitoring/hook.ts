import { useQuery } from "@tanstack/react-query"
import { getMonitoringServices } from "./api"
import { MONITORING_REFRESH_MS } from "./constants"

/** État des services sondé par core-backend, relu toutes les `MONITORING_REFRESH_MS`, en erreur comme en succès. */
export function useMonitoringServices() {
    return useQuery({
        queryKey: ["monitoring", "services"],
        queryFn: getMonitoringServices,
        refetchInterval: MONITORING_REFRESH_MS,
    })
}
