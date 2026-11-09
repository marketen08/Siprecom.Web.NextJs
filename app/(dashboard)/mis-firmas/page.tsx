import { redirect } from "next/navigation"

// Mis Firmas se movió a /ejecucion/firmas, con el resto de lo que se usa en obra.
// Esta ruta queda como redirect para no romper links viejos: favoritos, mails y el
// menú del usuario de versiones anteriores que sigan cacheadas en un navegador.
export default function MisFirmasLegacyRedirect() {
  redirect("/ejecucion/firmas")
}
