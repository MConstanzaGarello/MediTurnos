import { Profesional } from "../../db/models";

export async function listProfesionalesPorEspecialidad(especialidadId: number) {
  const profesionales = await Profesional.findAll({
    where: { especialidadId },
    order: [["nombre", "ASC"]],
  });

  return profesionales.map((p) => ({
    id: p.id,
    nombre: p.nombre,
    info: p.info,
    especialidadId: p.especialidadId,
  }));
}
