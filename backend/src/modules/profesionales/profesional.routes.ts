import { Router } from "express";
import { listProfesionalesHandler } from "./profesional.controller";

export const profesionalRouter = Router();

profesionalRouter.get("/", listProfesionalesHandler);
