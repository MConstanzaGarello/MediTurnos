import { Especialidad } from "../../db/models";

export async function listEspecialidades() {
  const especialidades = await Especialidad.findAll({
    order: [["nombre", "ASC"]],
  });
  return especialidades.map((e) => ({ id: e.id, nombre: e.nombre }));
}
