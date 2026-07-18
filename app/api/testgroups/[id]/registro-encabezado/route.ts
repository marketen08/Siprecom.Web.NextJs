import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params
  const res = await backendFetch(request, `/testgroups/${id}/registro-encabezado`)
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
