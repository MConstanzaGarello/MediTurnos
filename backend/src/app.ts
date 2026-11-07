import express from "express";
import cors from "cors";
import { env } from "./config/env";
import { pacienteRouter } from "./modules/pacientes/paciente.routes";
import { authRouter } from "./modules/auth/auth.routes";
import { especialidadRouter } from "./modules/especialidades/especialidad.routes";
import { profesionalRouter } from "./modules/profesionales/profesional.routes";
import { turnoRouter } from "./modules/turnos/turno.routes";
import { medicoRouter } from "./modules/medicos/medico.routes";
import { notFoundHandler } from "./middlewares/notFound";
import { errorHandler } from "./middlewares/errorHandler";

export function createApp() {
  const app = express();

  app.use(cors({ origin: env.corsOrigin }));
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

  app.use("/api/pacientes", pacienteRouter);
  app.use("/api/auth", authRouter);
  app.use("/api/especialidades", especialidadRouter);
  app.use("/api/profesionales", profesionalRouter);
  app.use("/api/turnos", turnoRouter);
  app.use("/api/medicos", medicoRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
