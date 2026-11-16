import type { Request, Response } from "express"
import ProjectionService from "../services/projection.service"

class ProjectionController {

    private projectionService = new ProjectionService()

    getProjection = async (req: Request, res: Response) => {
        res.json(await this.projectionService.get(req.params.backtestId as string, req.userId!))
    }
}

export default ProjectionController
