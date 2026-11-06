import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// POST /api/campos/eliminar-sin-uso → ejecuta la limpieza sobre los ids confirmados.
// El backend re-valida cada uno, así que esto no es la última palabra sobre qué se borra.
export async function POST(request: NextRequest) {
  const body = await request.json()
  const res = await backendFetch(request, "/campos/eliminar-sin-uso", {
    method: "POST",
    body: JSON.stringify(body),
  })
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
