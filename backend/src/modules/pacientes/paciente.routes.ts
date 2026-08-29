import { Router } from "express";
import { registerPatientHandler } from "./paciente.controller";

export const pacienteRouter = Router();

pacienteRouter.post("/registro", registerPatientHandler);
