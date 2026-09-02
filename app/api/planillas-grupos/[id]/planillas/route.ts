import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// POST /api/planillas-grupos/[id]/planillas — asigna planillas al grupo (bulk).
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params
  const body = await request.text()
  const res = await backendFetch(request, `/planillas-grupos/${id}/planillas`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
  })
  const data = await res.json().catch(() => ({ message: res.statusText }))
  return Response.json(data, { status: res.status })
}
