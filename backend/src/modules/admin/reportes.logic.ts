import type { ReporteMensual, TurnoParaReporte } from "./admin.types";

/** Franjas horarias del reporte (HU-12), como en el prototipo. */
const FRANJAS = [
  { franja: "7 a 9 hs", hasta: 9 },
  { franja: "9 a 12 hs", hasta: 12 },
  { franja: "12 a 15 hs", hasta: 15 },
  { franja: "15 a 18 hs", hasta: Infinity },
];

const TOP_PROFESIONALES = 5;

function indiceFranja(hora: string): number {
  const h = Number(hora.slice(0, 2));
  const i = FRANJAS.findIndex((f) => h < f.hasta);
  return i === -1 ? FRANJAS.length - 1 : i;
}

/**
 * Arma el reporte estadístico del mes (HU-12) a partir de los turnos del
 * período. Es una función pura (sin base de datos) para poder probarla con
 * datos armados a mano.
 * - realizados: turnos confirmados cuya fecha ya pasó (`fecha < hoy`)
 * - proximos: turnos confirmados de hoy en adelante
 * - tasaCancelacion: cancelados / total, redondeada a entero
 */
export function buildReporte(
  mes: string,
  turnos: TurnoParaReporte[],
  hoy: string
): ReporteMensual {
  const total = turnos.length;
  const cancelados = turnos.filter((t) => t.estado === "cancelado").length;
  const confirmados = turnos.filter((t) => t.estado === "confirmado");
  const realizados = confirmados.filter((t) => t.fecha < hoy).length;

  const porEspecialidad = new Map<string, number>();
  const franjas = FRANJAS.map(() => 0);
  const profesionales = new Map<
    number,
    { nombre: string; especialidad: string; confirmados: number; cancelados: number }
  >();

  for (const t of turnos) {
    porEspecialidad.set(t.especialidad, (porEspecialidad.get(t.especialidad) ?? 0) + 1);
    franjas[indiceFranja(t.hora)] += 1;

    const p = profesionales.get(t.profesionalId) ?? {
      nombre: t.profesional,
      especialidad: t.especialidad,
      confirmados: 0,
      cancelados: 0,
    };
    if (t.estado === "cancelado") p.cancelados += 1;
    else p.confirmados += 1;
    profesionales.set(t.profesionalId, p);
  }

  return {
    mes,
    totales: {
      total,
      realizados,
      proximos: confirmados.length - realizados,
      cancelados,
      tasaCancelacion: total === 0 ? 0 : Math.round((cancelados / total) * 100),
    },
    porEspecialidad: [...porEspecialidad.entries()]
      .map(([especialidad, cantidad]) => ({ especialidad, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad || a.especialidad.localeCompare(b.especialidad)),
    franjas: FRANJAS.map((f, i) => ({ franja: f.franja, cantidad: franjas[i] })),
    profesionales: [...profesionales.entries()]
      .map(([profesionalId, p]) => ({
        profesionalId,
        ...p,
        total: p.confirmados + p.cancelados,
      }))
      .sort((a, b) => b.total - a.total || a.nombre.localeCompare(b.nombre))
      .slice(0, TOP_PROFESIONALES),
  };
}
