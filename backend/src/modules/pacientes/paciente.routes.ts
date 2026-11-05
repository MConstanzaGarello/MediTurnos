import { Router } from "express";
import {
  registerPatientHandler,
  getPerfilPacienteHandler,
  updatePerfilPacienteHandler,
} from "./paciente.controller";
import { requireAuth } from "../../middlewares/requireAuth";

export const pacienteRouter = Router();

// Registro de pacientes (no requiere autenticación).
pacienteRouter.post("/registro", registerPatientHandler);

// HU-08 — Gestión del perfil (requiere autenticación).
pacienteRouter.get("/perfil", requireAuth, getPerfilPacienteHandler);
pacienteRouter.put("/perfil", requireAuth, updatePerfilPacienteHandler);