// Extiende el Request de Express para que los controladores puedan leer
// `req.pacienteId`, que carga el middleware requireAuth (ver
// src/middlewares/requireAuth.ts) después de validar el JWT.
import "express";

declare global {
  namespace Express {
    interface Request {
      pacienteId?: number;
    }
  }
}

export {};
