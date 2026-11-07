import { Router } from "express";

import { loginHandler } from "./auth.controller";

export const authRouter = Router();

// Login único: pacientes y médicos entran por acá (la respuesta trae el rol).
authRouter.post("/login", loginHandler);
