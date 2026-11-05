import { Router } from "express";
import { requireAdmin } from "../../middlewares/requireAdmin";
import {
  createMedicoHandler,
  dashboardHandler,
  listMedicosHandler,
  listObrasSocialesHandler,
  reporteHandler,
  updateEspecialidadHandler,
} from "./admin.controller";

export const adminRouter = Router();

// Todo lo de /api/admin exige un JWT de administrador (HU-11 / HU-12).
adminRouter.use(requireAdmin);

adminRouter.get("/dashboard", dashboardHandler);
adminRouter.get("/medicos", listMedicosHandler);
adminRouter.post("/medicos", createMedicoHandler);
adminRouter.patch("/medicos/:id/especialidad", updateEspecialidadHandler);
adminRouter.get("/obras-sociales", listObrasSocialesHandler);
adminRouter.get("/reportes", reporteHandler);
