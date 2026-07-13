import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// GET /api/proyectos/[id]/logo-header/sas — SAS URL vigente para preview.
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const res = await backendFetch(request, `/proyectos/${id}/logo-header/sas`)
  const data = await res.json().catch(() => ({}))
  return Response.json(data, { status: res.status })
}
