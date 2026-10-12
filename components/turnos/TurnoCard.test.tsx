// HU-04 — La tarjeta muestra especialidad, profesional, fecha, horario y estado.
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { MiTurno } from "@/lib/types/turno";
import { TurnoCard } from "./TurnoCard";

const turno: MiTurno = {
  id: 1,
  fecha: "2026-10-14",
  hora: "11:30",
  estado: "confirmado",
  especialidad: { id: 1, nombre: "Cardiología" },
  profesional: {
    id: 1,
    nombre: "Dr. Martín Gómez",
    info: "Atiende lunes y miércoles de 10 a 14 hs. Consultorio N° 7.",
  },
};

function textoDe(html: string) {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
}

describe("TurnoCard (CP-31)", () => {
  it("muestra los datos que pide el criterio de aceptación", () => {
    const texto = textoDe(renderToStaticMarkup(<TurnoCard turno={turno} />));

    expect(texto).toContain("Cardiología"); // especialidad
    expect(texto).toContain("Dr. Martín Gómez"); // profesional
    expect(texto).toContain("14/10/2026"); // fecha
    expect(texto).toContain("11:30"); // horario
    expect(texto).toContain("Confirmado"); // estado
    expect(texto).toContain("Consultorio N° 7");
  });

  it("muestra el estado Cancelado", () => {
    const texto = textoDe(
      renderToStaticMarkup(<TurnoCard turno={{ ...turno, estado: "cancelado" }} />)
    );
    expect(texto).toContain("Cancelado");
  });

  it("muestra los botones que le pasan HU-05 / HU-06", () => {
    const html = renderToStaticMarkup(
      <TurnoCard turno={turno} acciones={<button type="button">Cancelar</button>} />
    );
    expect(html).toContain(">Cancelar</button>");
  });
});
