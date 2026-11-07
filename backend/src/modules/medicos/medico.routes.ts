import { Router } from "express";
import { requireDoctorAuth } from "../../middlewares/requireDoctorAuth";
import {
  actualizarPerfilHandler,
  getDashboardHandler,
  getPacientesHandler,
  getPerfilHandler,
} from "./medico.controller";

export const medicoRouter = Router();

// Todo el Portal del Médico requiere un JWT de médico: el profesional sale
// del token, así que cada médico ve únicamente sus propios datos.
medicoRouter.use(requireDoctorAuth);

medicoRouter.get("/dashboard", getDashboardHandler);
medicoRouter.get("/pacientes", getPacientesHandler);
medicoRouter.get("/perfil", getPerfilHandler);
medicoRouter.patch("/perfil", actualizarPerfilHandler);
