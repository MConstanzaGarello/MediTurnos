import { Router } from "express";
import {
  createTurnoHandler,
  getHorariosDisponibilidadHandler,
} from "./turno.controller";
import { requireAuth } from "../../middlewares/requireAuth";

export const turnoRouter = Router();

// Consultar especialidades/profesionales/horarios es público (no hace
// falta estar logueado para mirar disponibilidad).
turnoRouter.get("/horarios-disponibles", getHorariosDisponibilidadHandler);

// Pedir un turno sí requiere sesión: el paciente sale del JWT, no del body.
turnoRouter.post("/", requireAuth, createTurnoHandler);
