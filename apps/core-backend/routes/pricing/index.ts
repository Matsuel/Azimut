import express from "express";
import { registerRoutes } from "@azimut/http";
import createPricingRoutes from "./pricing.routes";

const pricingRouter = express.Router();

registerRoutes(pricingRouter, createPricingRoutes());

export default pricingRouter;
