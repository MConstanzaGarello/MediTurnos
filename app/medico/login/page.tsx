import { redirect } from "next/navigation";

// Ya no hay un login especial para médicos: entran por el mismo login que los
// pacientes (la pantalla inicial) y el sistema los lleva a su vista. Esta ruta
// queda solo para que los enlaces viejos no den error.
export default function MedicoLoginRedirectPage() {
  redirect("/");
}
