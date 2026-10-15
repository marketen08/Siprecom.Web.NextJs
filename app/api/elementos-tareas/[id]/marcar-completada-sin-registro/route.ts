import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// POST /api/elementos-tareas/[id]/marcar-completada-sin-registro
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const body = await request.text()
  const res = await backendFetch(
    request,
    `/elementos-tareas/${id}/marcar-completada-sin-registro`,
    {
      method: "POST",
      body,
      headers: { "content-type": "application/json" },
    },
  )
  const text = await res.text()
  const ct = res.headers.get("content-type") ?? ""
  if (!ct.includes("application/json")) {
    return Response.json(
      { message: `Backend devolvió ${res.status} no-JSON: ${text.slice(0, 500)}` },
      { status: res.status || 500 }
    )
  }
  return Response.json(JSON.parse(text), { status: res.status })
}
