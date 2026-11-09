import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// GET → qué cambiaría al poner al día las asignaciones que salieron de este grupo.
// Va antes de aplicar porque la acción saca gente de trabajo asignado.
export async function GET(
  request: NextRequest,
  context: RouteContext<"/api/usuarios-grupos/[id]/reexpansion/preview">,
) {
  const { id } = await context.params
  const res = await backendFetch(request, `/usuarios-grupos/${id}/reexpansion/preview`)
  const data = await res.json().catch(() => ({ message: res.statusText }))
  return Response.json(data, { status: res.status })
}
