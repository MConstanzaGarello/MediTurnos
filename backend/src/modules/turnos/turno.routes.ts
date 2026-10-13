import { Router } from "express";
import {
  createTurnoHandler,
  getHorariosDisponibilidadHandler,
  getMisTurnosHandler,
  reprogramarTurnoHandler,
} from "./turno.controller";
import { requireAuth } from "../../middlewares/requireAuth";

export const turnoRouter = Router();

// Consultar especialidades/profesionales/horarios es público (no hace
// falta estar logueado para mirar disponibilidad).
turnoRouter.get("/horarios-disponibles", getHorariosDisponibilidadHandler);

// HU-04: turnos del paciente logueado. Requiere sesión: el paciente sale
// del JWT, así que cada uno ve únicamente los suyos.
turnoRouter.get("/mis-turnos", requireAuth, getMisTurnosHandler);

// Pedir un turno sí requiere sesión: el paciente sale del JWT, no del body.
turnoRouter.post("/", requireAuth, createTurnoHandler);

// HU-06: reprogramar un turno propio (el paciente sale del JWT).
turnoRouter.put("/:id/reprogramar", requireAuth, reprogramarTurnoHandler);
