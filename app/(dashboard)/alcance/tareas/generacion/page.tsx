import { redirect } from "next/navigation"

// La generación de ETs faltantes se movió a /coordinacion/tareas como tab.
// Esta ruta legacy queda como redirect permanente para no romper links viejos
// (favoritos, docs, etc).
export default function GeneracionTareasLegacyRedirect() {
  redirect("/coordinacion/tareas?tab=faltantes")
}
