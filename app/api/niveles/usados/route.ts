import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// GET /api/niveles/usados — niveles que el proyecto del user logueado
// realmente atraviesa (con al menos una ElementoTarea viva). Para selects
// "en contexto" como el filtro del visor 3D.
export async function GET(request: NextRequest) {
  const res = await backendFetch(request, "/niveles/usados")
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
