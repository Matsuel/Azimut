import express from "express";
import { registerRoutes } from "@azimut/http";
import createAccountRoutes from "./account.routes";

const accountRouter = express.Router();

registerRoutes(accountRouter, createAccountRoutes());

export default accountRouter;
