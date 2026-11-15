import { API_ERROR_CODES, riskConstraintInputSchema } from "@azimut/contracts"
import type { Request, Response } from "express"
import { BadRequestError } from "@azimut/http"
import RiskService from "../services/risk.service"

class RiskController {

    private riskService = new RiskService()

    getRisk = async (req: Request, res: Response) => {
        res.json(await this.riskService.get(req.params.backtestId as string, req.userId!))
    }

    setConstraint = async (req: Request, res: Response) => {
        const parsed = riskConstraintInputSchema.safeParse(req.body)
        if (!parsed.success) throw new BadRequestError(API_ERROR_CODES.INVALID_RISK_LIMIT, { issues: parsed.error.issues })
        res.json(await this.riskService.setLimit(req.params.backtestId as string, req.userId!, parsed.data.maxDrawdownLimit))
    }
}

export default RiskController
