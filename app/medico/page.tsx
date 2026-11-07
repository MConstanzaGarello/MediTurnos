import { redirect } from "next/navigation";

// /medico no tiene contenido propio: lleva al dashboard (que a su vez
// redirige al login si no hay sesión de médico).
export default function MedicoIndexPage() {
  redirect("/medico/inicio");
}
