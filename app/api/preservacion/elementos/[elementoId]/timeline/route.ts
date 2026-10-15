import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// GET /api/preservacion/elementos/{elementoId}/timeline
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ elementoId: string }> },
) {
  const { elementoId } = await params
  const res = await backendFetch(request, `/preservacion/elementos/${elementoId}/timeline`)
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
