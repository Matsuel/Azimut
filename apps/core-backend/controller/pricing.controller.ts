import type { Request, Response } from "express"
import { API_ERROR_CODES, pricingInputSchema } from "@azimut/contracts"
import { BadRequestError } from "@azimut/http"
import PricingService from "../services/pricing.service"

class PricingController {

    private pricingService = new PricingService()

    createPricing = async (req: Request, res: Response) => {
        const parsed = pricingInputSchema.safeParse(req.body)
        if (!parsed.success) throw new BadRequestError(API_ERROR_CODES.INVALID_PRICING, { issues: parsed.error.issues })
        res.status(202).json(await this.pricingService.create(req.userId!, parsed.data))
    }

    getPricing = async (req: Request, res: Response) => {
        res.json(await this.pricingService.get(req.params.id as string, req.userId!))
    }
}

export default PricingController
