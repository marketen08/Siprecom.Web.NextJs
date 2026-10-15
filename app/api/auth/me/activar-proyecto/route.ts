import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// POST /api/auth/me/activar-proyecto
// A diferencia de PATCH me/proyecto-activo, este crea el acceso en RecursosProyectos
// si al usuario le falta. Es lo que permite entrar a un proyecto que administra pero
// al que nunca se asignaron — típicamente los importados de la versión anterior.
export async function POST(request: NextRequest) {
  const body = await request.json()
  const res = await backendFetch(request, "/auth/me/activar-proyecto", {
    method: "POST",
    body: JSON.stringify(body),
  })
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
