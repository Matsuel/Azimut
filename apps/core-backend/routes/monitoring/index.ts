import express from "express";
import { registerRoutes } from "@azimut/http";
import createMonitoringRoutes from "./monitoring.routes";

const monitoringRouter = express.Router();

registerRoutes(monitoringRouter, createMonitoringRoutes());

export default monitoringRouter;
