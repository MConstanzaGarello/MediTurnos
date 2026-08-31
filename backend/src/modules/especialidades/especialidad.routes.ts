import { Router } from "express";
import { listEspecialidadesHandler } from "./especialidad.controller";

export const especialidadRouter = Router();

especialidadRouter.get("/", listEspecialidadesHandler);
