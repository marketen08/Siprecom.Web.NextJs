import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// GET /api/especialidades/usadas — especialidades que el proyecto del user
// logueado realmente usa (al menos un Elemento activo con ElementoTipo
// apuntando a ella). Para selects "en contexto" como el filtro del visor 3D.
export async function GET(request: NextRequest) {
  const res = await backendFetch(request, "/especialidades/usadas")
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
