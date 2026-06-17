import { redirect } from "next/navigation"

// /alcance es solo un segmento agrupador del menú (sin contenido propio).
// Sin esta página, navegar/prefetch a /alcance devuelve 404.
// Redirigimos al primer hijo real de la sección.
export default function AlcanceIndexPage() {
  redirect("/alcance/proyectos")
}
