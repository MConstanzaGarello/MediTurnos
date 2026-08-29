import express from "express";
import cors from "cors";
import { env } from "./config/env";
import { pacienteRouter } from "./modules/pacientes/paciente.routes";
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

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
