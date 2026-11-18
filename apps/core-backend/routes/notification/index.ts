import express from "express";
import { registerRoutes } from "@azimut/http";
import createNotificationRoutes from "./notification.routes";

const notificationRouter = express.Router();

registerRoutes(notificationRouter, createNotificationRoutes());

export default notificationRouter;
