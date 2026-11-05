import { describe, expect, it } from "vitest";
import { etiquetaMes, mesActualLocal, mesesParaSelector, porcentajeDelMaximo } from "./reportes";

describe("reportes (HU-12)", () => {
  it("etiquetaMes escribe el mes en español", () => {
    expect(etiquetaMes("2026-11")).toBe("Noviembre 2026");
    expect(etiquetaMes("2027-01")).toBe("Enero 2027");
  });

  it("mesesParaSelector va del más nuevo al más viejo y cruza el año", () => {
    expect(mesesParaSelector("2026-02", 4)).toEqual(["2026-02", "2026-01", "2025-12", "2025-11"]);
    expect(mesesParaSelector("2026-11")).toHaveLength(12);
  });

  it("mesActualLocal usa año y mes con dos dígitos", () => {
    expect(mesActualLocal(new Date(2026, 2, 9))).toBe("2026-03");
  });

  it("porcentajeDelMaximo no divide por cero", () => {
    expect(porcentajeDelMaximo(5, 10)).toBe(50);
    expect(porcentajeDelMaximo(10, 10)).toBe(100);
    expect(porcentajeDelMaximo(0, 0)).toBe(0);
  });
});
