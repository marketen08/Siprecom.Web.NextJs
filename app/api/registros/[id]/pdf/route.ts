import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

export async function GET(
  request: NextRequest,
  context: RouteContext<"/api/registros/[id]/pdf">
) {
  const { id } = await context.params
  const res = await backendFetch(request, `/registros/${id}/pdf`)
  return new Response(res.body, {
    status: res.status,
    headers: {
      "Content-Type": res.headers.get("Content-Type") ?? "application/pdf",
      "Content-Disposition": res.headers.get("Content-Disposition") ?? `attachment; filename="registro-${id}.pdf"`,
    },
  })
}
