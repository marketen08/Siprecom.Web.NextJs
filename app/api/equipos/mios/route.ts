import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// Los equipos del propio usuario y cuál tiene activo. Lo consume el menú del perfil, que
// con un solo equipo muestra el nombre y ninguna opción de cambio.
export async function GET(request: NextRequest) {
  const res = await backendFetch(request, "/equipos/mios")
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
