import express from "express";
import { registerRoutes } from "@azimut/http";
import createRiskRoutes from "./risk.routes";

const riskRouter = express.Router();

registerRoutes(riskRouter, createRiskRoutes());

export default riskRouter;
