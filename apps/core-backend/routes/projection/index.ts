import express from "express";
import { registerRoutes } from "@azimut/http";
import createProjectionRoutes from "./projection.routes";

const projectionRouter = express.Router();

registerRoutes(projectionRouter, createProjectionRoutes());

export default projectionRouter;
