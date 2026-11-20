import { monitoringServicesResponseSchema } from "@azimut/contracts"
import type { Request, Response } from "express"
import MonitoringService from "../services/monitoring.service"

class MonitoringController {

    private monitoringService = new MonitoringService()

    // Réponse validée par le contrat : la page Monitoring l'affiche telle quelle
    getServices = async (_req: Request, res: Response) => {
        res.json(monitoringServicesResponseSchema.parse(await this.monitoringService.getServices()))
    }
}

export default MonitoringController
