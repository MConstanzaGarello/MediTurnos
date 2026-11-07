import { Router } from "express";
import {
  createTurnoHandler,
  getHorariosDisponibilidadHandler,
  getMisTurnosHandler,
  reprogramarTurnoHandler,
} from "./turno.controller";
import { requireAuth } from "../../middlewares/requireAuth";
import { cancelTurnoHandler } from "./turno.cancelar";
import { requireDoctorAuth } from "../../middlewares/requireDoctorAuth";
import { updateEstadoTurnoHandler } from "./turno.estado";
import { reprogramarTurnoMedicoHandler } from "./turno.reprogramarMedico";

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

// HU-06: reprogramar un turno propio (el paciente sale del JWT).
turnoRouter.put("/:id/reprogramar", requireAuth, reprogramarTurnoHandler);

// Portal del Médico: el médico marca un turno propio como atendido/pendiente
// (el médico sale del JWT de médico, no del body).
turnoRouter.patch("/:id/estado", requireDoctorAuth, updateEstadoTurnoHandler);

// Portal del Médico: el médico reprograma un turno de su agenda (sin la regla
// de 24 h del paciente). El médico sale del JWT de médico.
turnoRouter.put("/:id/reprogramar-medico", requireDoctorAuth, reprogramarTurnoMedicoHandler);
