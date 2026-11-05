/** HU-12 — Pruebas unitarias del armado del reporte mensual (sin base de datos). */
import { buildReporte } from "../../src/modules/admin/reportes.logic";
import type { TurnoParaReporte } from "../../src/modules/admin/admin.types";

function turno(p: Partial<TurnoParaReporte>): TurnoParaReporte {
  return {
    fecha: "2026-11-10",
    hora: "09:00",
    estado: "confirmado",
    profesionalId: 1,
    profesional: "Dr. Gómez",
    especialidad: "Cardiología",
    ...p,
  };
}

describe("buildReporte (HU-12)", () => {
  it("mes sin turnos: todo en cero y sin dividir por cero", () => {
    const r = buildReporte("2026-11", [], "2026-11-05");
    expect(r.totales).toEqual({ total: 0, realizados: 0, proximos: 0, cancelados: 0, tasaCancelacion: 0 });
    expect(r.porEspecialidad).toEqual([]);
    expect(r.profesionales).toEqual([]);
    expect(r.franjas.map((f) => f.cantidad)).toEqual([0, 0, 0, 0]);
  });

  it("separa realizados (fecha pasada) de próximos y calcula la tasa de cancelación", () => {
    const r = buildReporte(
      "2026-11",
      [
        turno({ fecha: "2026-11-02" }), // realizado
        turno({ fecha: "2026-11-04" }), // realizado
        turno({ fecha: "2026-11-05" }), // hoy -> próximo
        turno({ fecha: "2026-11-20" }), // próximo
        turno({ fecha: "2026-11-03", estado: "cancelado" }),
      ],
      "2026-11-05"
    );
    expect(r.totales).toEqual({ total: 5, realizados: 2, proximos: 2, cancelados: 1, tasaCancelacion: 20 });
  });

  it("cuenta por especialidad ordenado de mayor a menor", () => {
    const r = buildReporte(
      "2026-11",
      [
        turno({ especialidad: "Pediatría" }),
        turno({ especialidad: "Cardiología" }),
        turno({ especialidad: "Pediatría" }),
      ],
      "2026-11-05"
    );
    expect(r.porEspecialidad).toEqual([
      { especialidad: "Pediatría", cantidad: 2 },
      { especialidad: "Cardiología", cantidad: 1 },
    ]);
  });

  it("agrupa por franja horaria (7-9, 9-12, 12-15, 15-18)", () => {
    const r = buildReporte(
      "2026-11",
      ["08:00", "09:00", "11:30", "14:00", "14:30", "16:30"].map((hora) => turno({ hora })),
      "2026-11-05"
    );
    expect(r.franjas).toEqual([
      { franja: "7 a 9 hs", cantidad: 1 },
      { franja: "9 a 12 hs", cantidad: 2 },
      { franja: "12 a 15 hs", cantidad: 2 },
      { franja: "15 a 18 hs", cantidad: 1 },
    ]);
  });

  it("ranking de profesionales: confirmados y cancelados, máximo 5", () => {
    const turnos: TurnoParaReporte[] = [];
    for (let id = 1; id <= 7; id++) {
      for (let i = 0; i < id; i++) {
        turnos.push(turno({ profesionalId: id, profesional: `Dr. ${id}` }));
      }
    }
    turnos.push(turno({ profesionalId: 7, profesional: "Dr. 7", estado: "cancelado" }));

    const r = buildReporte("2026-11", turnos, "2026-11-05");
    expect(r.profesionales).toHaveLength(5);
    expect(r.profesionales[0]).toEqual({
      profesionalId: 7,
      nombre: "Dr. 7",
      especialidad: "Cardiología",
      confirmados: 7,
      cancelados: 1,
      total: 8,
    });
    expect(r.profesionales[1].profesionalId).toBe(6);
  });
});
