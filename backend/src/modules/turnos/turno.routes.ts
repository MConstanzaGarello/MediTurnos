import { Router } from "express";
import {
  createTurnoHandler,
  getHorariosDisponibilidadHandler,
  getMisTurnosHandler,
} from "./turno.controller";
import { requireAuth } from "../../middlewares/requireAuth";
import { cancelTurnoHandler } from "./turno.cancelar";

export const turnoRouter = Router();

// Consultar especialidades/profesionales/horarios es público (no hace
// falta estar logueado para mirar disponibilidad).
turnoRouter.get("/horarios-disponibles", getHorariosDisponibilidadHandler);

// HU-04: turnos del paciente logueado. Requiere sesión: el paciente sale
// del JWT, así que cada uno ve únicamente los suyos.
turnoRouter.get("/mis-turnos", requireAuth, getMisTurnosHandler);

// Pedir un turno sí requiere sesión: el paciente sale del JWT, no del body.
turnoRouter.post("/", requireAuth, createTurnoHandler);


// HU-05: cancelar un turno propio (también requiere sesión).
turnoRouter.patch("/:id/cancelar", requireAuth, cancelTurnoHandler);
