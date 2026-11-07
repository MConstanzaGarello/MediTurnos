// Extiende el Request de Express para que los controladores puedan leer
// `req.pacienteId`, que carga el middleware requireAuth (ver
// src/middlewares/requireAuth.ts) después de validar el JWT, y
// `req.profesionalId`, que carga requireDoctorAuth (Portal del Médico).
import "express";

declare global {
  namespace Express {
    interface Request {
      pacienteId?: number;
      profesionalId?: number;
    }
  }
}

export {};
