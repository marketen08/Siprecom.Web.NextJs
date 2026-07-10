import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// POST /api/registros/resolver-por-elemento-tarea/{elementoTareaId}
// Devuelve el registro BORRADOR de esa ET (creándolo si estaba PENDIENTE).
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ elementoTareaId: string }> },
) {
  const { elementoTareaId } = await params
  const res = await backendFetch(
    request,
    `/registros/resolver-por-elemento-tarea/${elementoTareaId}`,
    { method: "POST" },
  )
  const data = await res.json().catch(() => ({ message: res.statusText }))
  return Response.json(data, { status: res.status })
}
